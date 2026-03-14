'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Camera, Package } from 'lucide-react';

const navItems = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/paciente', label: 'Paciente', icon: User },
    { href: '/diagnostico', label: 'Diagnóstico', icon: Camera },
    { href: '/stock', label: 'Stock', icon: Package },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-item${isActive ? ' active' : ''}`}
                        >
                            <div className="nav-item-icon">
                                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                            </div>
                            <span className="nav-item-label">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
