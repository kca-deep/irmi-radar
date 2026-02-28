import { NextResponse } from "next/server";

// -- API 응답 타입 --
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// -- 성공 응답 --
export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"]
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

// -- 에러 응답 --
export function errorResponse(
  message: string,
  status: number = 400
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// -- 쿼리 파라미터 파싱 헬퍼 --
export function getSearchParams(request: Request) {
  const url = new URL(request.url);
  return url.searchParams;
}
