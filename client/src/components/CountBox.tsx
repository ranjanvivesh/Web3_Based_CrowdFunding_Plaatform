import React from "react";
import { useStateContext } from "../context";

interface CustomCountBoxProps {
  title: string;
  value: string | number;
}

const CountBox: React.FC<CustomCountBoxProps> = ({
  title,
  value,
}): JSX.Element => {
  const context = useStateContext();
  const isDarkMode = context?.isDarkMode ?? true;
  
  return (
    <div className="flex flex-col items-center w-[150px]">
      <h4
        className={`font-epilogue font-bold text-[30px] p-3 rounded-t-[10px] w-full text-center truncate transition-colors duration-300 ${
          isDarkMode 
            ? 'text-white bg-[#1c1c24]' 
            : 'text-[#13131a] bg-slate-200'
        }`}
      >
        {value}
      </h4>
      <p className={`font-epilogue font-normal text-[16px] px-3 py-2 w-full rounded-b-[10px] text-center transition-colors duration-300 ${
        isDarkMode 
          ? 'text-[#808191] bg-[#28282e]' 
          : 'text-[#666] bg-slate-100'
      }`}>{title}</p>
    </div>
  );
};

export default CountBox;
