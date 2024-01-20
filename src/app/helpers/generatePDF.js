import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function generatePdf(nFactura, fecha, cliente, cif, direccion, ciudad, concepto, precio) {
  const doc = new jsPDF();

  doc.text("Ensupunto", 14, 15);
  doc.text("Nolanoir S.L.", 14, 23);
  doc.text("C.I.F: B-90.173.683", 14, 31);
  doc.text("Urb. Aljamar 3, Nº 189", 14, 39);
  doc.text("41940 Tomares, Sevilla", 14, 47);

  doc.text("FACTURA", 130, 15); // TODO Poner aqui el logo

  autoTable(doc, {
    head: [["Nº Factura", "Fecha"]],
    body: [[nFactura, fecha]],
    startY: 60,
    tableWidth: 100,
  });

  doc.text(cliente, 130, 60);
  doc.text(cif, 130, 68);
  doc.text(direccion, 130, 76);
  doc.text(ciudad, 130, 84);

  const calcIva = (parseFloat(precio) * 0.1).toFixed(2);
  // setIva(calcIva)

  const calcTotal = (parseFloat(precio) + parseFloat(calcIva)).toFixed(2);

  autoTable(doc, {
    head: [
      ["Codigo", "Concepto", "cantidad", "Precio", "Inpuestos", "IVA", "Total"],
    ],
    body: [
      ["1", concepto, "1", precio + "€", "10%", calcIva + "€", calcTotal + "€"],
    ],
    startY: 100,
    tableWidth: 180,
  });

  doc.save(`invoice_${nFactura}.pdf`);
}
