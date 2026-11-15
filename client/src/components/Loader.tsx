import React from 'react'
import { loader } from '../assets'
import { useStateContext } from '../context'

const Loader = () => {
  const context = useStateContext();
  const isDarkMode = context?.isDarkMode ?? true;
  
  return (
    <div className={`fixed inset-0 z-10 h-screen flex items-center justify-center flex-flex transition-colors duration-300 ${
      isDarkMode ? 'bg-[rgba(0,0,0,0.7)]' : 'bg-[rgba(0,0,0,0.4)]'
    }`}>
        
        <img src={loader} alt="loader" className='w-[100px] h-[100px] object-contain'/>
        <p className={`mt-[20px] font-epilogue font-bold text-[20px] text-center transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-[#13131a]'
        }`}>

            Transaction is in progress ...
        </p>
        </div>
  )
}

export default Loader