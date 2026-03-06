/**
 * DB 헬스체크 API
 * better-sqlite3 + Next.js Turbopack 호환성 검증용
 */
import { NextResponse } from "next/server";
import { dbExists } from "@/lib/db";
import { getDbStats } from "@/lib/db/queries";

export async function GET() {
  try {
    if (!dbExists()) {
      return NextResponse.json({
        status: "no_db",
        message: "irmi.db not found. Run preprocessing script first.",
      });
    }

    const stats = getDbStats();
    return NextResponse.json({
      status: "ok",
      ...stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
