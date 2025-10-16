"use client";

import generatePDF from "@/app/helpers/generatePDF";
import { getSettings } from "@/app/helpers/settingsStore";
import { useState } from "react";
import Toast from "./Toast";

export default function Invoform() {
  const [show, setShow] = useState(false);
  const [clearMsg, setClearMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [nFactura, setNFactura] = useState("");
  const [fecha, setFecha] = useState("");
  const [cliente, setCliente] = useState("");
  const [cif, setCif] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [concepto, setConcepto] = useState("");
  const [precio, setPrecio] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar que exista un perfil activo
    const activeProfile = getSettings();
    if (!activeProfile) {
      setProfileErr(
        "Debes seleccionar o crear una compañía activa en Configuración"
      );
      setTimeout(() => setProfileErr(""), 4000);
      return;
    }

    if (nFactura === "" || fecha === "") {
      setShow(true);

      setTimeout(() => {
        setShow(false);
      }, 5000);

      return;
    }

    const formattedFecha = new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    generatePDF({
      nFactura,
      fecha: formattedFecha,
      cliente,
      cif,
      direccion,
      ciudad,
      concepto,
      precio,
    });
  };

  const handleNFacturaChange = (e) => {
    setNFactura(e.target.value);
  };

  const handleFechaChange = (e) => {
    setFecha(e.target.value);
  };

  const handleClienteChange = (e) => {
    setCliente(e.target.value);
  };

  const handleCifChange = (e) => {
    setCif(e.target.value);
  };

  const handleDireccionChange = (e) => {
    setDireccion(e.target.value);
  };

  const handleCiudadChange = (e) => {
    setCiudad(e.target.value);
  };

  const handleConceptoChange = (e) => {
    setConcepto(e.target.value);
  };

  const handlePrecioChange = (e) => {
    setPrecio(e.target.value);
  };

  const handleClear = () => {
    setShow(false);
    setClearMsg("");
    setNFactura("");
    setFecha("");
    setCliente("");
    setCif("");
    setDireccion("");
    setCiudad("");
    setConcepto("");
    setPrecio("");

    // Scroll al inicio del formulario
    try {
      const formEl = document.querySelector("form");
      formEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}

    // Mostrar toast breve de éxito
    setClearMsg("Formulario restablecido");
    setTimeout(() => setClearMsg(""), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Generar factura
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Completa los datos para crear el PDF de tu factura.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Datos de factura */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Datos de factura
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nFactura"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nº de factura
                </label>
                <input
                  id="nFactura"
                  type="number"
                  name="nFactura"
                  placeholder="0001"
                  value={nFactura}
                  onChange={handleNFacturaChange}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="fecha"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={fecha}
                  onChange={handleFechaChange}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Datos del cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cliente"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Cliente
                </label>
                <input
                  id="cliente"
                  type="text"
                  name="cliente"
                  placeholder="Nombre o empresa"
                  value={cliente}
                  onChange={handleClienteChange}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="cif"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  CIF/NIF
                </label>
                <input
                  id="cif"
                  type="text"
                  name="cif"
                  placeholder="B12345678"
                  value={cif}
                  onChange={handleCifChange}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="direccion"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Dirección
                </label>
                <input
                  id="direccion"
                  type="text"
                  name="direccion"
                  placeholder="Calle, número, piso"
                  value={direccion}
                  onChange={handleDireccionChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
              <div>
                <label
                  htmlFor="ciudad"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Ciudad
                </label>
                <input
                  id="ciudad"
                  type="text"
                  name="ciudad"
                  placeholder="Ciudad, Provincia"
                  value={ciudad}
                  onChange={handleCiudadChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Detalle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label
                  htmlFor="concepto"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Concepto
                </label>
                <input
                  id="concepto"
                  type="text"
                  name="concepto"
                  placeholder="Descripción del servicio o producto"
                  value={concepto}
                  onChange={handleConceptoChange}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                />
              </div>
              <div className="md:col-span-1">
                <label
                  htmlFor="precio"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Precio
                </label>
                <div className="mt-1 relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    €
                  </div>
                  <input
                    id="precio"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    name="precio"
                    placeholder="0.00"
                    value={precio}
                    onChange={handlePrecioChange}
                    required
                    className="block w-full rounded-lg border border-gray-300 bg-white/90 pl-8 pr-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-lg bg-transparent border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Generar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pt-5 space-x-3">
        {show ? (
          <Toast
            message="Tienes que rellenar todos los campos"
            type="warning"
          />
        ) : null}
        {profileErr ? <Toast message={profileErr} type="error" /> : null}
        {clearMsg ? <Toast message={clearMsg} type="success" /> : null}
      </div>
    </form>
  );
}
