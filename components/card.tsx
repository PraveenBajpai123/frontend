import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`pb-4 border-b border-border ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }: CardProps) {
  return (
    <h2 className={`text-2xl font-bold text-foreground ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className = '', ...props }: CardProps) {
  return (
    <p className={`text-sm text-muted-foreground mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`pt-4 border-t border-border flex gap-2 justify-end ${className}`} {...props}>
      {children}
    </div>
  );
}
