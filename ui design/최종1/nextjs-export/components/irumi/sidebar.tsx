"use client";

/**
 * sidebar.tsx
 * 변환 포인트:
 *   - react-router의 Link, useLocation → next/link, next/navigation의 usePathname
 *   - 색상 클래스를 Tailwind CSS 변수 토큰으로 대체
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "대시보드",  href: "/irumi" },
  { label: "맞춤 분석", href: "/irumi/analysis" },
  { label: "위기 신호", href: "/irumi/signals" },
  { label: "뉴스 분석", href: "/irumi/news" },
  { label: "기자의 시선", href: "/irumi/reporters" },
] as const;

/**
 * href 앞의 경로 prefix ("/irumi" 등)는 실제 프로젝트의 App Router 구조에 맞게 수정하세요.
 */
export function IrumiSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] h-screen sticky top-0 bg-card border-r border-border pt-10 pb-8 px-4 flex flex-col justify-between shrink-0">
      <div className="flex flex-col gap-10">
        {/* 로고 */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-[20px] h-[20px] rounded-full bg-irumi-brand flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-[800] text-irumi-brand leading-none mb-1">
              이르미
            </span>
            <span className="text-[10px] text-[var(--irumi-text-3)] leading-none tracking-tight">
              민생위기 조기경보 레이더
            </span>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex flex-col gap-[2px]">
          {NAV_ITEMS.map(({ label, href }) => {
            const isActive =
              href === "/irumi"
                ? pathname === "/irumi"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
                  isActive
                    ? "bg-irumi-brand-muted text-irumi-brand"
                    : "text-[var(--irumi-text-4)] hover:bg-[#F9F9F9] hover:text-[var(--irumi-text-1)]"
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
          <div className="text-[11px] text-[var(--irumi-text-2)] leading-snug relative z-10 mb-1">
            위기 신호 발생 시
            <br />
            즉시 알림을 받아보세요
          </div>
          <button className="bg-white text-irumi-brand text-[11px] font-[600] py-1.5 rounded-[6px] border border-irumi-brand-border hover:bg-irumi-brand-muted transition-colors relative z-10">
            설정하기
          </button>
        </div>

        <div className="w-full h-[1px] bg-border my-2" />

        {/* 사용자 영역 */}
        <div className="flex flex-col gap-3">
          <button className="flex items-center gap-2 text-[12px] font-[500] text-[var(--irumi-text-4)] hover:text-[var(--irumi-text-1)] transition-colors px-1">
            {/* 설정 아이콘 — @hugeicons/react의 Settings01Icon 으로 교체하세요 */}
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

          {/* 사용자 프로필 — 실제 사용자 데이터로 교체하세요 */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-[32px] h-[32px] rounded-full bg-[var(--irumi-text-1)] text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
              김
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-[600] text-[var(--irumi-text-1)]">김매경님</span>
              <span className="text-[10px] text-[var(--irumi-text-4)]">개인 회원</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
