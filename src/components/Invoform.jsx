'use client'

import {useState} from 'react'
import Toast from './Toast'
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
        <input type="number" name="nFactura" label="NFactura" placeholder='NFactura' value={nFactura} onChange={handleNFacturaChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        <input type="date" name="fecha"  value={fecha} onChange={handleFechaChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700" />
      </div>
      <diI className='flex items-center gap-5 flex-row mb-5'>
        <input type="text" name="client" label="Cliente" placeholder='Cliente' value={cliente} onChange={handleClienteChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" name="cif" label="CIF" placeholder='CIF' value={cif} onChange={handleCifChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </diI>
      <diI className='flex items-center gap-5 flex-row mb-5'>
        <input type="text" name="direccion" label="Direccion" placeholder='Dirección' value={direccion} onChange={handleDireccionChange} class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" name="ciudad" label="Ciudad" placeholder='Ciudad' value={ciudad} onChange={handleCiudadChange} class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </diI>
      <diI className='flex items-center gap-5 flex-row mb-5'>
        <input type="text" name="concepto" label="Concepto" placeholder='Concepto' value={concepto} onChange={handleConceptoChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="number" name="precio" label="Precio" placeholder='Cantidad' value={precio} onChange={handlePrecioChange} isRequired class="border border-gray-300 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </diI>

      <div className='flex justify-center'>
        <button type="submit" color='primary' variant='bordered' class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">PDF</button>
      </div>
      <div className='flex items-center justify-center pt-5'>
        {show ? <Toast message="Tienes que rellenar todos los campos" type='warning' /> : null}
      </div>
    </form>
  )
}
