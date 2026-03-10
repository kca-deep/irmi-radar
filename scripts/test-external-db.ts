import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchLegislationByKeywords, fetchBillsByKeywords, fetchNarsAnalysesByKeywords } from "../lib/api/assembly";
import { fetchGovServicesByCategory } from "../lib/api/gov-service";
import { getDb, closeDb } from "../lib/db/index";

async function main() {
  const keywords = ["물가", "고용", "자영업", "소상공인", "금융", "부동산", "주거", "임대", "대출", "복지"];

  console.log("=== 1. 국회 API 호출 ===");
  const [legislation, bills, nars] = await Promise.all([
    fetchLegislationByKeywords(keywords, 10).catch((e: Error) => { console.error("legislation err:", e.message); return [] as any[]; }),
    fetchBillsByKeywords(keywords, 10).catch((e: Error) => { console.error("bills err:", e.message); return [] as any[]; }),
    fetchNarsAnalysesByKeywords(keywords, 5).catch((e: Error) => { console.error("nars err:", e.message); return [] as any[]; }),
  ]);
  console.log("legislation:", legislation.length, "bills:", bills.length, "nars:", nars.length);

  const db = getDb();
  const now = new Date().toISOString();

  if (legislation.length > 0) {
    const ins = db.prepare(
      `INSERT OR REPLACE INTO assembly_legislations
        (bill_id, bill_no, name, proposer, proposer_kind, committee, deadline_dt, link_url, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const l of legislation) {
        ins.run(l.billId, l.billNo, l.name, l.proposer, l.proposerKind, l.committee, l.deadlineDt, l.linkUrl, now);
      }
    })();
    console.log("assembly_legislations saved:", legislation.length);
  }

  if (bills.length > 0) {
    const ins = db.prepare(
      `INSERT OR REPLACE INTO assembly_bills
        (bill_id, bill_no, name, kind, proposer_kind, propose_dt, result, link_url, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const b of bills) {
        ins.run(b.billId, b.billNo, b.name, b.kind, b.proposerKind, b.proposeDt, b.result, b.linkUrl, now);
      }
    })();
    console.log("assembly_bills saved:", bills.length);
  }

  if (nars.length > 0) {
    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('nars_analyses', ?, datetime('now'))`
    ).run(JSON.stringify(nars));
    console.log("nars_analyses cached:", nars.length);
  }

  console.log("\n=== 2. 보조금24 API 호출 ===");
  const services = await fetchGovServicesByCategory("prices", 5).catch((e: Error) => {
    console.error("gov err:", e.message);
    return [] as any[];
  });
  console.log("gov_services fetched:", services.length);

  if (services.length > 0) {
    const ins = db.prepare(
      `INSERT OR REPLACE INTO gov_services
        (service_id, service_name, service_purpose, support_type, target_audience,
         selection_criteria, support_content, apply_method, apply_deadline,
         detail_url, org_name, dept_name, contact, service_field, org_type,
         reception_org, view_count, registered_at, modified_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const seen = new Set<string>();
    db.transaction(() => {
      for (const s of services) {
        if (seen.has(s.serviceId)) continue;
        seen.add(s.serviceId);
        ins.run(
          s.serviceId, s.serviceName, s.servicePurpose, s.supportType,
          s.targetAudience, s.selectionCriteria, s.supportContent, s.applyMethod,
          s.applyDeadline, s.detailUrl, s.orgName, s.deptName, s.contact,
          s.serviceField, s.orgType, s.receptionOrg, s.viewCount,
          s.registeredAt, s.modifiedAt, now
        );
      }
    })();
    console.log("gov_services saved (unique):", seen.size);
  }

  console.log("\n=== 3. DB 검증 ===");
  console.log("assembly_legislations:", db.prepare("SELECT COUNT(*) as cnt FROM assembly_legislations").get());
  console.log("assembly_bills:", db.prepare("SELECT COUNT(*) as cnt FROM assembly_bills").get());
  console.log("gov_services:", db.prepare("SELECT COUNT(*) as cnt FROM gov_services").get());

  const sampleBills = db.prepare("SELECT bill_no, name FROM assembly_bills LIMIT 3").all();
  console.log("\nsample bills:", JSON.stringify(sampleBills, null, 2));
  const sampleSvcs = db.prepare("SELECT service_id, service_name FROM gov_services LIMIT 3").all();
  console.log("sample services:", JSON.stringify(sampleSvcs, null, 2));

  closeDb();
}

main().catch(console.error);
