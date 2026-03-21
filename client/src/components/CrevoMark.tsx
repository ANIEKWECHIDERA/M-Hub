type CrevoMarkProps = {
  className?: string;
};

export function CrevoMark({ className }: CrevoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M45.6 16.8C41.9 13.1 37.1 11 31.6 11C19.4 11 10.4 20.1 10.4 32C10.4 43.9 19.4 53 31.6 53C37.1 53 41.9 50.9 45.7 47.1L38.6 40.8C36.8 42.4 34.4 43.3 31.8 43.3C25.5 43.3 20.8 38.4 20.8 32C20.8 25.6 25.5 20.7 31.8 20.7C34.5 20.7 36.9 21.7 38.7 23.3L45.6 16.8Z"
        fill="currentColor"
      />
      <path
        d="M38.8 21.7L47.5 11H56L43.1 26.4L38.8 21.7Z"
        fill="currentColor"
      />
      <path
        d="M24.8 42.9L16.4 53H8L20.5 38.2L24.8 42.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
