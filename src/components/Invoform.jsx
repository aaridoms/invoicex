'use client'

import {useState} from 'react'
import Toast from './Toast'
import {Input} from "@nextui-org/react";
import {Button, ButtonGroup} from "@nextui-org/react";
import generatePDF from '@/app/helpers/generatePDF';

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

  const handleSubmit = (e) => {
    e.preventDefault()
    
      if (nFactura === '' || fecha === '') {
        setShow(true)

        setTimeout(() => {
          setShow(false)
        }, 5000)

        return
      }

    generatePDF({nFactura, fecha, cliente, cif, direccion, ciudad, concepto, precio})
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
