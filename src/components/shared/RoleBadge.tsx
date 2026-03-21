import { cn } from '@/lib/utils/cn';

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  owner: { label: 'Propietario', bg: 'rgba(72,217,178,0.25)', text: '#11978c' },
  admin: { label: 'Administrador', bg: 'rgba(72,217,178,0.25)', text: '#11978c' },
  manager: { label: 'Operador', bg: 'rgba(187,6,157,0.15)', text: '#bb069d' },
  viewer: { label: 'Estadista', bg: 'rgba(200,111,10,0.15)', text: '#c86f0a' },
  store_owner: { label: 'Dueño tienda', bg: 'rgba(72,217,178,0.25)', text: '#11978c' },
  installer: { label: 'Instalador', bg: 'rgba(0,77,255,0.2)', text: '#0000FF' },
};

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? { label: role, bg: 'rgba(0,0,0,0.1)', text: '#333' };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-[136px] h-[27px] rounded-full text-[15px] font-medium whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
