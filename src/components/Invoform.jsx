'use client'

import {useState} from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Toast from './Toast'
import {Input} from "@nextui-org/react";
import {Button, ButtonGroup} from "@nextui-org/react";

export default function Invoform() {

  const [show, setShow] = useState(false)
  const [nFactura, setNFactura] = useState('')
  const [fecha, setFecha] = useState('')
  const [cliente, setCliente] = useState('')
  const [cif, setCif] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [concepto, setConcepto] = useState('')
  const [precio, setPrecio] = useState()
  // const [iva, setIva] = useState(0)

  const generatePDF = () => {
    const doc = new jsPDF()

    doc.text('Ensupunto', 14, 15)
    doc.text('Nolanoir S.L.', 14, 23)
    doc.text('C.I.F: B-90.173.683', 14, 31)
    doc.text('Urb. Aljamar 3, Nº 189', 14, 39)
    doc.text('41940 Tomares, Sevilla', 14, 47)

    doc.text('FACTURA', 130, 15) // TODO Poner aqui el logo

    autoTable(doc, {
      head: [['Nº Factura', 'Fecha']],
      body: [[nFactura, fecha]],
      startY: 60,
      tableWidth: 100,
    })

    doc.text(cliente, 130, 60)
    doc.text(cif, 130, 68)
    doc.text(direccion, 130, 76)
    doc.text(ciudad, 130, 84)

    const calcIva = (parseFloat(precio) * 0.1 ).toFixed(2)
    // setIva(calcIva)

    const calcTotal = (parseFloat(precio) + parseFloat(calcIva)).toFixed(2)

    autoTable(doc, {
      head: [['Codigo', 'Concepto', 'cantidad', 'Precio', 'Inpuestos', 'IVA', 'Total']],
      body: [['1', concepto, '1', precio + '€', '10%', calcIva + '€', calcTotal + '€']],
      startY: 100,
      tableWidth: 180,
    })

    doc.save(`invoice_${nFactura}.pdf`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
      if (nFactura === '' || fecha === '') {
        setShow(true)

        setTimeout(() => {
          setShow(false)
        }, 5000)

        return
      }

    generatePDF()
  }

  const handleNFacturaChange = (e) => {
    setNFactura(e.target.value)
  }

  const handleFechaChange = (e) => {
    setFecha(e.target.value)
  }

  const handleClienteChange = (e) => {
    setCliente(e.target.value)
  }

  const handleCifChange = (e) => {
    setCif(e.target.value)
  }

  const handleDireccionChange = (e) => {
    setDireccion(e.target.value)
  }

  const handleCiudadChange = (e) => {
    setCiudad(e.target.value)
  }

  const handleCodigoChange = (e) => {
    setCodigo(e.target.value)
  }

  const handleConceptoChange = (e) => {
    setConcepto(e.target.value)
  }

  const handleCantidadChange = (e) => {
    setCantidad(e.target.value)
  }

  const handlePrecioChange = (e) => {
    setPrecio(e.target.value)
  }

  const handleImpuestosChange = (e) => {
    setImpuestos(e.target.value)
  }

  const handleIvaChange = (e) => {
    setIva(e.target.value)
  }

  const handleTotalChange = (e) => {
    setTotal(e.target.value)
  }

  return (
    <form onSubmit={handleSubmit} >
      <div className='flex items-center gap-5 flex-row mb-5'>
        <Input type="number" name="nFactura" label="NFactura" value={nFactura} onChange={handleNFacturaChange} isRequired />
        <Input type="date" name="fecha"  value={fecha} onChange={handleFechaChange} isRequired />
      </div>
      <div className='flex items-center gap-5 flex-row mb-5'>
        <Input type="text" name="client" label="Cliente" value={cliente} onChange={handleClienteChange} isRequired />
        <Input type="text" name="cif" label="CIF" value={cif} onChange={handleCifChange} isRequired />
      </div>
      <div className='flex items-center gap-5 flex-row mb-5'>
        <Input type="text" name="direccion" label="Direccion" value={direccion} onChange={handleDireccionChange} />
        <Input type="text" name="ciudad" label="Ciudad" value={ciudad} onChange={handleCiudadChange} />
      </div>
      <div className='flex items-center gap-5 flex-row mb-5'>
        <Input type="text" name="concepto" label="Concepto" value={concepto} onChange={handleConceptoChange} isRequired />
        <Input type="number" name="precio" label="Precio" value={precio} onChange={handlePrecioChange} isRequired />
      </div>

      <ButtonGroup className='flex '>
        <Button type="submit" color="primary" variant='bordered'>PDF</Button>
      </ButtonGroup>
      <div className='flex items-center justify-center pt-5'>
        {show ? <Toast /> : null}
      </div>
    </form>
  )
}
