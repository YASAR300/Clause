export function LogoMark({ className = "h-5 w-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="24" height="24" rx="6" fill="#0f1011" />
      <path
        d="M7 8.5C7 7.67157 7.67157 7 8.5 7H11V11H8.5C7.67157 11 7 10.3284 7 9.5V8.5Z"
        fill="#5e6ad2"
      />
      <path
        d="M13 8.5C13 7.67157 13.6716 7 14.5 7H17V11H14.5C13.6716 11 13 10.3284 13 9.5V8.5Z"
        fill="#f7f8f8"
      />
      <path
        d="M7 14.5C7 13.6716 7.67157 13 8.5 13H11V17H8.5C7.67157 17 7 16.3284 7 15.5V14.5Z"
        fill="#f7f8f8"
        fillOpacity="0.4"
      />
      <path
        d="M13 14.5C13 13.6716 13.6716 13 14.5 13H17V17H14.5C13.6716 17 13 16.3284 13 15.5V14.5Z"
        fill="#5e6ad2"
        fillOpacity="0.7"
      />
      <circle cx="17.5" cy="6.5" r="1.5" fill="#4cb782" />
    </svg>
  );
}

export function Logo({ className = "", textClassName = "", iconSize = "h-6 w-6" }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <LogoMark className={iconSize} />
      <span className={`text-base font-semibold tracking-tight text-text ${textClassName}`}>
        Clause
      </span>
    </div>
  );
}
