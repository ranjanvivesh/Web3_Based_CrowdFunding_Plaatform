import React from 'react'
import { useStateContext } from '../context';

interface CustomFormFieldProps{
  labelName:string,
   placeholder:string,
   inputType?: string,
   isTextArea?: boolean,
   value: string | number,
   handleChange: any
}

const FormField : React.FC<CustomFormFieldProps>=({
  labelName,
  placeholder,
  inputType,
  isTextArea,
  value,
  handleChange
}):JSX.Element =>{
  const context = useStateContext();
  const isDarkMode = context?.isDarkMode ?? true;
  
  return(
    <label className='flex-1 w-full flex flex-col'>
    {labelName && (
      <span className="mb-[10px] text-[13px] font-bold" style={{ color: 'var(--secondary)' }}>{labelName}</span>
    )}
    {isTextArea ? (
      <textarea
      required
      value={value}
      onChange={handleChange}
      rows={10}
      placeholder={placeholder}
      className="rounded-[14px] border border-[color-mix(in_srgb,var(--secondary)_28%,transparent)] bg-transparent px-[15px] py-[15px] text-[14px] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]"
      />
    ): (
      <input
      required
      value={value}
      onChange={handleChange}
      type={inputType}
      step="0.01"
      placeholder={placeholder}
      className="rounded-[14px] border border-[color-mix(in_srgb,var(--secondary)_28%,transparent)] bg-transparent px-[15px] py-[15px] text-[14px] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]"
      />
    )}
  </label>
  )
}
  

export default FormField