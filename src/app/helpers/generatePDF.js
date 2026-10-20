import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeInvoice, formatEuro, formatQty } from "./invoiceMath";

// Factura en A4, pensada para imprimirse: fondo blanco, tipografía
// sobria y un único color de acento.
//
// invoice: {
//   nFactura, fecha ("aaaa-mm-dd"), notas, pricesIncludeVat,
//   cliente: { nombre, cif, direccion, ciudad },
//   items: [{ concepto, cantidad, precio, iva }]
// }

const PAGE_W = 210;
const PAGE_H = 297;
const M = 18; // margen lateral

const INK = [17, 24, 39];
const TEXT = [55, 65, 81];
const SOFT = [120, 126, 138];
const LINE = [226, 229, 234];
const FILL = [245, 246, 248];
const ACCENT = [16, 163, 127];

// "aaaa-mm-dd" -> "dd/mm/aaaa" sin pasar por Date (evita desfases horarios)
export const formatDate = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

function drawLogo(doc, dataUrl, x, y) {
  try {
    const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    const { width, height } = doc.getImageProperties(dataUrl);
    // Encajar en 40 x 16 mm manteniendo la proporción
    const scale = Math.min(40 / width, 16 / height);
    const w = width * scale;
    const h = height * scale;
    doc.addImage(dataUrl, format, x, y, w, h);
    return h;
  } catch {
    return 0; // Un logo defectuoso no debe impedir generar la factura
  }
}

function label(doc, text, x, y, options) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...SOFT);
  doc.text(text.toUpperCase(), x, y, { charSpace: 0.4, ...options });
}

function drawHeader(doc, invoice, settings) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_W, 2.5, "F");

  // Emisor (izquierda)
  let y = 18;
  if (settings?.logoDataUrl) {
    const h = drawLogo(doc, settings.logoDataUrl, M, y);
    if (h) y += h + 7;
  }
  const brand = settings?.brandTitle || settings?.companyName || "Tu empresa";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(brand, M, y + 4);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const issuer = [
    settings?.brandTitle && settings?.companyName ? settings.companyName : "",
    settings?.cif ? `NIF/CIF: ${settings.cif}` : "",
    settings?.address1,
    settings?.address2,
    settings?.email,
  ].filter(Boolean);
  for (const line of issuer) {
    doc.text(String(line), M, y);
    y += 4.6;
  }

  // Título y datos de la factura (derecha)
  const right = PAGE_W - M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text("FACTURA", right, 26, { align: "right" });

  const meta = [
    ["Nº de factura", invoice.nFactura || "—"],
    ["Fecha", formatDate(invoice.fecha) || "—"],
  ];
  let my = 36;
  for (const [k, v] of meta) {
    label(doc, k, right - 62, my);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(String(v), right, my, { align: "right" });
    my += 6.5;
  }

  return Math.max(y, my) + 4;
}

function drawClient(doc, cliente, y) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(M, y, PAGE_W - M, y);
  y += 9;

  label(doc, "Facturar a", M, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(cliente?.nombre || "—", M, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const lines = [
    cliente?.cif ? `NIF/CIF: ${cliente.cif}` : "",
    cliente?.direccion,
    cliente?.ciudad,
  ].filter(Boolean);
  for (const line of lines) {
    doc.text(String(line), M, y);
    y += 4.6;
  }
  return y + 6;
}

function drawItems(doc, calc, startY) {
  const body = calc.lines.length
    ? calc.lines.map((l) => [
        l.concepto || "—",
        formatQty(l.cantidad),
        formatEuro(l.precioUnitario),
        `${l.iva}%`,
        formatEuro(l.base),
      ])
    : [
        [
          {
            content: "Añade conceptos a la factura",
            colSpan: 5,
            styles: { textColor: SOFT, fontStyle: "italic" },
          },
        ],
      ];

  autoTable(doc, {
    startY,
    margin: { left: M, right: M, bottom: 28 },
    head: [["Descripción", "Cant.", "Precio", "IVA", "Importe"]],
    body,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      textColor: TEXT,
      cellPadding: { top: 3.4, bottom: 3.4, left: 3, right: 3 },
      lineColor: LINE,
      lineWidth: { bottom: 0.2 },
    },
    headStyles: {
      fillColor: FILL,
      textColor: SOFT,
      fontStyle: "bold",
      fontSize: 7.5,
      lineWidth: 0,
    },
    columnStyles: {
      0: { textColor: INK },
      1: { halign: "right", cellWidth: 16 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 15 },
      4: { halign: "right", cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index > 0) {
        data.cell.styles.halign = "right";
      }
    },
  });
  return doc.lastAutoTable.finalY;
}

function drawTotals(doc, calc, startY) {
  const width = 82;
  const multipleRates = calc.byRate.length > 1;
  const rows = [["Base imponible", formatEuro(calc.base)]];
  for (const g of calc.byRate) {
    rows.push([
      multipleRates
        ? `IVA ${g.iva}% s/ ${formatEuro(g.base)}`
        : `IVA ${g.iva}%`,
      formatEuro(g.cuota),
    ]);
  }
  if (calc.byRate.length === 0) rows.push(["IVA", formatEuro(0)]);

  autoTable(doc, {
    startY: startY + 5,
    margin: { left: PAGE_W - M - width, right: M, bottom: 28 },
    tableWidth: width,
    body: [
      ...rows,
      [
        {
          content: "Total",
          styles: { fontStyle: "bold", textColor: INK, fontSize: 11 },
        },
        {
          content: formatEuro(calc.total),
          styles: { fontStyle: "bold", textColor: INK, fontSize: 12 },
        },
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 9.5,
      textColor: TEXT,
      valign: "middle",
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
    },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.row.index === rows.length) {
        data.cell.styles.fillColor = FILL;
        data.cell.styles.cellPadding = { top: 3.5, bottom: 3.5, left: 3, right: 3 };
      }
    },
  });
  return doc.lastAutoTable.finalY;
}

function drawNotes(doc, blocks, startY) {
  let y = startY + 12;
  const width = PAGE_W - 2 * M;
  for (const [title, text] of blocks) {
    if (!String(text || "").trim()) continue;
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(String(text), width);
    if (y + 6 + lines.length * 4.4 > PAGE_H - 28) {
      doc.addPage();
      y = 24;
    }
    label(doc, title, M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(lines, M, y + 5.5);
    y += 5.5 + lines.length * 4.4 + 6;
  }
}

function drawFooters(doc, settings) {
  const pages = doc.getNumberOfPages();
  const issuer = [settings?.companyName, settings?.cif, settings?.email]
    .filter(Boolean)
    .join("   ·   ");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, PAGE_H - 16, PAGE_W - M, PAGE_H - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    if (issuer) doc.text(issuer, M, PAGE_H - 10.5);
    doc.text(`Página ${i} de ${pages}`, PAGE_W - M, PAGE_H - 10.5, {
      align: "right",
    });
  }
}

// settings: datos del emisor { brandTitle, companyName, cif, address1,
// address2, email, logoDataUrl, footerNote }
export function buildInvoicePdf(invoice, settings) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({
    title: `Factura ${invoice.nFactura || ""}`.trim(),
    creator: "InvoiceX",
  });

  const calc = computeInvoice(invoice.items || [], {
    pricesIncludeVat: !!invoice.pricesIncludeVat,
  });

  let y = drawHeader(doc, invoice, settings);
  y = drawClient(doc, invoice.cliente, y);
  y = drawItems(doc, calc, y);
  y = drawTotals(doc, calc, y);
  drawNotes(
    doc,
    [
      ["Notas", invoice.notas],
      ["Información adicional", settings?.footerNote],
    ],
    y
  );
  drawFooters(doc, settings);

  return { doc, calc };
}

// Bytes del PDF para la vista previa en pantalla
export function invoicePreviewData(invoice, settings) {
  const { doc } = buildInvoicePdf(invoice, settings);
  return doc.output("arraybuffer");
}

export const invoiceFilename = (nFactura) =>
  `factura_${String(nFactura).replace(/[\\/:*?"<>|\s]+/g, "-")}.pdf`;
