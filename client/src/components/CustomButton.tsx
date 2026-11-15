import React from 'react';

interface CustomButtonProps {
  btnType: "button" | "submit" | "reset";
  title: string;
  handleClick?: React.MouseEventHandler<HTMLButtonElement>;
  styles?: string;
}




const CustomButton: React.FC<CustomButtonProps> = ({
  btnType,
  title,
  handleClick,
  styles = ""
}): JSX.Element => {
  return (
    <button
      type={btnType}
      className={`cozy-pill min-h-[48px] px-5 font-body text-[15px] font-extrabold text-[var(--card)] transition hover:scale-[1.02] ${styles}`}
      onClick={handleClick}
    >
      {title}
    </button>
  );
};

export default CustomButton;
