"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { BookOpen, Play, RefreshCw, Sparkles, Stethoscope, Wallet } from "lucide-react";
import { rovingKeys } from "@/components/ui/a11y";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { addMonths } from "@/lib/finance";
import { monthKey } from "@/lib/money";
import { LESSONS } from "@/lib/lessons";
import { useHydrated, usePolaris } from "@/lib/store";
import { LessonsTour } from "./LessonsTour";
import { MarginsOverheadsTab } from "./MarginsOverheadsTab";
import { MoneyCheckup } from "./MoneyCheckup";
import { MonthNav, useExcelRoundTrip, useMonthContext, useSheetHelper, useWrapped, WrappedOverlays } from "./monthTools";
import { OverviewTab } from "./OverviewTab";
import { ImportPreview } from "./sheet/ImportPreview";
import { LumiAssist } from "./sheet/LumiAssist";
import { MonthlySheet } from "./sheet/MonthlySheet";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sheet", label: "Monthly sheet" },
  { id: "costs", label: "Margins & overheads" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const isTab = (id: string | null): id is Tab => TABS.some((t) => t.id === id);

const STATEMENT_TYPES = ".csv,.txt,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp";

export function Treasury() {
  const hydrated = useHydrated();
  // Everything below reads today's date, so it only renders in the browser.
  if (!hydrated) return <div className="h-96 animate-pulse rounded-[1.25rem] bg-fg/[0.04]" />;
  return <TreasuryBody />;
}

function TreasuryBody() {
  const hasData = usePolaris((s) => s.entries.length > 0 || s.products.length > 0 || s.overheads.length > 0);
  const entries = usePolaris((s) => s.entries);
  const reports = usePolaris((s) => s.monthReports);
  const lessonsDone = usePolaris((s) => s.lessonsDone.length);
  const markTourSeen = usePolaris((s) => s.markTourSeen);
  // Other pages link straight to a tab (/treasury?tab=costs). Next keeps this page alive between
  // visits, so a later link arrives as a changed address rather than a fresh start: follow it.
  const wanted = useSearchParams().get("tab");
  const [tab, setTabState] = useState<Tab>(() => (isTab(wanted) ? wanted : "overview"));
  const [followed, setFollowed] = useState(wanted);
  if (wanted !== followed) {
    setFollowed(wanted);
    if (isTab(wanted)) setTabState(wanted);
  }
  // Stock used to be a tab here; it has its own page now.
  const router = useRouter();
  useEffect(() => {
    if (wanted === "stock") router.replace("/stock");
  }, [wanted, router]);
  const [checkup, setCheckup] = useState(false);

  // Keep the address in step with the tab, so it can be shared or come back to.
  function setTab(next: Tab) {
    setTabState(next);
    window.history.replaceState(null, "", next === "overview" ? window.location.pathname : `?tab=${next}`);
  }
  // The money lessons open by themselves on the first visit; after that, from the header button.
  const [lessons, setLessons] = useState<"first" | "again" | null>(() =>
    usePolaris.getState().toursSeen.includes("treasury") ? null : "first",
  );

  // One selected month, shared by the Overview, the sheet and the Wrapped button.
  const [offset, setOffset] = useState(0);
  const selected = addMonths(new Date(), offset);
  const month = monthKey(selected);
  const monthLabel = selected.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const monthName = selected.toLocaleDateString(undefined, { month: "long" });
  const hasRows = entries.some((e) => e.date.startsWith(month));
  const report = reports[month];

  const helper = useSheetHelper(month, monthLabel);
  const excel = useExcelRoundTrip(month, monthLabel, { onMessage: helper.setMessage, onNotTemplate: helper.importFile });
  const wrapped = useWrapped(month);
  const statementInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const excelInput = useRef<HTMLInputElement>(null);
  useMonthContext(month, monthLabel, tab === "overview" || tab === "sheet");

  function changeMonth(next: number) {
    setOffset(next);
    helper.reset();
  }

  const nav = <MonthNav label={monthLabel} onPrev={() => changeMonth(offset - 1)} onNext={() => changeMonth(offset + 1)} canNext={offset < 0} />;
  const writing = wrapped.state === "writing";

  return (
    <>
      <PageHeader
        icon={Wallet}
        eyebrow="Cashflow and money"
        title="Treasury"
        description="Track money in and out, know your margins on every platform, keep overheads lean and learn to master your cashflow."
        actions={
          <>
            <Button onClick={() => setLessons("again")} title="Quick money lessons, with a check and XP for each">
              <BookOpen className="size-4" aria-hidden /> Lessons {lessonsDone}/{LESSONS.length}
            </Button>
            {report ? (
              <>
                <Button
                  variant="ghost"
                  onClick={wrapped.make}
                  disabled={writing || !hasRows}
                  aria-label={`Remake ${monthName} Wrapped`}
                  title="Write it again with the latest numbers"
                  className="px-3"
                >
                  <RefreshCw className="size-4" aria-hidden />
                </Button>
                <Button onClick={() => wrapped.watch(report)}>
                  <Play className="size-4" aria-hidden /> Watch {monthName} Wrapped
                </Button>
              </>
            ) : (
              <Button onClick={wrapped.make} disabled={writing || !hasRows} title={hasRows ? undefined : `Log some ${monthName} sales or costs first`}>
                <Sparkles className="size-4" aria-hidden /> Make my {monthName} Wrapped
              </Button>
            )}
            <Button
              onClick={() => setCheckup(true)}
              disabled={!hasData}
              title={hasData ? "Deep review with NVIDIA Nemotron Ultra" : "Log some sales, costs or products first"}
            >
              <Stethoscope className="size-4" aria-hidden /> Money check-up
            </Button>
          </>
        }
      />

      {/* Wraps onto two rows on phones instead of scrolling sideways */}
      <div
        className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-fg/[0.04] p-1 ring-1 ring-line sm:inline-flex sm:flex-nowrap sm:rounded-full"
        role="tablist"
        aria-label="Treasury"
        onKeyDown={rovingKeys}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`treasury-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="treasury-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors pointer-coarse:py-3",
              tab === t.id ? "bg-fg/[0.1] text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="treasury-panel" role="tabpanel" aria-labelledby={`treasury-tab-${tab}`}>
        {tab === "overview" && (
          <OverviewTab
            selected={selected}
            nav={nav}
            helper={
              <LumiAssist
                busy={helper.busy}
                message={helper.message}
                flags={helper.flags}
                onStatement={() => statementInput.current?.click()}
                onCategorise={helper.categorise}
                onCheck={helper.check}
                onDownloadExcel={excel.download}
                onUploadExcel={() => excelInput.current?.click()}
                onShowSheet={() => setTab("sheet")}
                className="h-full"
              />
            }
          />
        )}
        {tab === "sheet" && <MonthlySheet selected={selected} nav={nav} flags={helper.flags} onWatch={wrapped.watch} />}
        {tab === "costs" && <MarginsOverheadsTab />}
      </div>

      <input
        ref={statementInput}
        type="file"
        accept={STATEMENT_TYPES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          // Photos can't be redacted before the AI sees them, so say so first.
          if (f.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name)) setPhoto(f);
          else void helper.importFile(f);
        }}
      />
      {photo && (
        <Modal onClose={() => setPhoto(null)} labelledBy="photo-title">
          <h2 id="photo-title" className="pr-8 text-lg font-bold">
            Photos go to the AI as they are
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            In PDF, CSV and Excel statements, card and account numbers are blanked out before the AI reads them. A photo
            can&apos;t be, so anything visible in it, account numbers included, is sent to NVIDIA Nemotron on Nebius. Cover
            them first, or download your statement as a PDF or CSV from your bank instead.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const f = photo;
                setPhoto(null);
                void helper.importFile(f);
              }}
            >
              Upload the photo anyway
            </Button>
            <Button variant="ghost" onClick={() => setPhoto(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
      <input
        ref={excelInput}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void excel.upload(f);
        }}
      />

      {helper.preview && <ImportPreview transactions={helper.preview} month={month} monthLabel={monthLabel} onClose={helper.closePreview} />}

      {excel.pending && (
        <Modal onClose={excel.cancel} labelledBy="replace-title">
          <h2 id="replace-title" className="pr-8 text-lg font-bold">
            Replace {monthLabel} with your file?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your file has {excel.pending.rows} rows and {excel.pending.activities} activities for {monthLabel}. They&apos;ll replace the{" "}
            {excel.pending.replacing} rows in the sheet now.
          </p>
          <div className="mt-6 flex gap-2">
            <Button onClick={excel.apply}>Replace</Button>
            <Button variant="ghost" onClick={excel.cancel}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      <WrappedOverlays wrapped={wrapped} monthLabel={monthLabel} />
      {checkup && <MoneyCheckup onClose={() => setCheckup(false)} />}
      {lessons && (
        <LessonsTour
          firstVisit={lessons === "first"}
          onClose={() => {
            setLessons(null);
            markTourSeen("treasury");
          }}
        />
      )}
    </>
  );
}
