"use client";

/**
 * sidebar.tsx
 * 변환 포인트:
 *   - react-router의 Link, useLocation -> next/link, next/navigation의 usePathname
 *   - 색상 클래스를 globals.css의 irumi 디자인 토큰으로 매핑
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface NavItem {
  label: string;
  href: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "대시보드",  href: "/irumi" },
  { label: "맞춤 분석", href: "/irumi/analysis" },
  { label: "위기 신호", href: "/irumi/signals" },
  { label: "뉴스 분석", href: "/irumi/news" },
  { label: "기자의 시선", href: "/irumi/reporters" },
];

interface IrumiSidebarProps {
  navItems?: NavItem[];
}

export function IrumiSidebar({ navItems = DEFAULT_NAV_ITEMS }: IrumiSidebarProps) {
  const pathname = usePathname();
  const basePath = navItems[0]?.href ?? "/";

  return (
    <aside className="w-[220px] h-screen sticky top-0 bg-card border-r border-border pt-10 pb-8 px-4 flex flex-col justify-between shrink-0">
      <div className="flex flex-col gap-10">
        {/* 로고 */}
        <div
          className="flex shrink-0 items-baseline px-2"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", letterSpacing: "0.06em", gap: "5px" }}
        >
          <span style={{ fontWeight: 900 }} className="text-foreground">IRMI</span>
          <span className="inline-block size-1.5 rounded-full bg-irumi-brand" style={{ marginLeft: "-2px", marginRight: "2px", alignSelf: "center" }} />
          <span style={{ fontWeight: 300 }} className="text-foreground/70">Radar</span>
        </div>

        {/* 네비게이션 */}
        <nav className="flex flex-col gap-[2px]">
          {navItems.map(({ label, href }) => {
            const isActive =
              href === basePath
                ? pathname === basePath
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
                  isActive
                    ? "bg-irumi-nav-active-bg text-irumi-brand"
                    : "text-irumi-text-4 hover:bg-[#F9F9F9] hover:text-irumi-text-1"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-2 ${
                    isActive ? "bg-irumi-brand" : "bg-[#CCCCCC]"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 하단 영역 */}
      <div className="flex flex-col gap-4 px-2">
        {/* 알림 설정 카드 */}
        <div className="bg-irumi-brand-muted rounded-[12px] p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] w-12 h-12 bg-[#FFEBDF] rounded-full opacity-50" />
          <div className="text-[12px] font-[700] text-irumi-brand relative z-10">알림 설정</div>
          <div className="text-[11px] text-irumi-text-2 leading-snug relative z-10 mb-1">
            위기 신호 발생 시
            <br />
            즉시 알림을 받아보세요
          </div>
          <button className="bg-white text-irumi-brand text-[11px] font-[600] py-1.5 rounded-[6px] border border-irumi-brand-border hover:bg-[#FFF3EC] transition-colors relative z-10">
            설정하기
          </button>
        </div>

        <div className="w-full h-[1px] bg-irumi-line my-2" />

        {/* 사용자 영역 */}
        <div className="flex flex-col gap-3">
          <button className="flex items-center gap-2 text-[12px] font-[500] text-irumi-text-4 hover:text-irumi-text-1 transition-colors px-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            설정
          </button>

          <div className="flex items-center gap-2 mt-1">
            <div className="w-[32px] h-[32px] rounded-full bg-irumi-text-1 text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
              김
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-[600] text-irumi-text-1">김매경님</span>
              <span className="text-[10px] text-irumi-text-4">개인 회원</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
