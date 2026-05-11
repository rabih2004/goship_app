export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {children}
    </div>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}
