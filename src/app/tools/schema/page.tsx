"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Plus, Trash2, Building2, MapPin, MessageSquare,
  ChevronRight, Code2, ArrowLeft, ExternalLink,
} from "lucide-react";

interface OrgFields {
  name: string; url: string; logo: string; description: string;
  phone: string; email: string;
  linkedin: string; twitter: string; facebook: string; instagram: string;
}

interface LocalBizFields extends OrgFields {
  streetAddress: string; city: string; state: string;
  postalCode: string; country: string;
  openingHours: string; priceRange: string;
  latitude: string; longitude: string;
}

interface FAQItem { question: string; answer: string }

function buildOrgSchema(f: OrgFields) {
  const sameAs: string[] = [f.linkedin, f.twitter, f.facebook, f.instagram].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    ...(f.name && { name: f.name }),
    ...(f.url && { url: f.url }),
    ...(f.logo && { logo: f.logo }),
    ...(f.description && { description: f.description }),
    ...(f.phone && { telephone: f.phone }),
    ...(f.email && { email: f.email }),
    ...(sameAs.length && { sameAs }),
  } as Record<string, unknown>;
}

function buildLocalBizSchema(f: LocalBizFields) {
  const base = buildOrgSchema(f);
  const address: Record<string, string> = {};
  if (f.streetAddress) address.streetAddress = f.streetAddress;
  if (f.city) address.addressLocality = f.city;
  if (f.state) address.addressRegion = f.state;
  if (f.postalCode) address.postalCode = f.postalCode;
  if (f.country) address.addressCountry = f.country;

  return {
    ...base,
    "@type": "LocalBusiness",
    ...(Object.keys(address).length && { address: { "@type": "PostalAddress", ...address } }),
    ...(f.openingHours && { openingHours: f.openingHours }),
    ...(f.priceRange && { priceRange: f.priceRange }),
    ...(f.latitude && f.longitude && {
      geo: { "@type": "GeoCoordinates", latitude: f.latitude, longitude: f.longitude },
    }),
  } as Record<string, unknown>;
}

function buildFAQSchema(items: FAQItem[]) {
  const valid = items.filter(i => i.question.trim() && i.answer.trim());
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map(i => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

function highlight(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-emerald-600";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) cls = "text-violet-700 font-semibold";
          else cls = "text-pink-600";
        } else if (/true|false/.test(match)) cls = "text-amber-600";
        else if (/null/.test(match)) cls = "text-gray-400";
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function Field({ label, value, onChange, placeholder, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-2 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full input-field text-sm px-3 py-2 rounded-xl"
      />
      {hint && <p className="text-xs text-ink-4 mt-1">{hint}</p>}
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-2 mb-1">{label}</label>
      <textarea
        rows={2} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full input-field text-sm px-3 py-2 rounded-xl resize-none"
      />
    </div>
  );
}

const ORG_DEFAULTS: OrgFields = {
  name: "", url: "", logo: "", description: "",
  phone: "", email: "",
  linkedin: "", twitter: "", facebook: "", instagram: "",
};

function OrgForm({ fields, onChange }: { fields: OrgFields; onChange: (f: OrgFields) => void }) {
  const set = (key: keyof OrgFields) => (v: string) => onChange({ ...fields, [key]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Business Name" value={fields.name} onChange={set("name")} placeholder="Acme Inc." />
        <Field label="Website URL" value={fields.url} onChange={set("url")} placeholder="https://acme.com" type="url" />
      </div>
      <Field label="Logo URL" value={fields.logo} onChange={set("logo")} placeholder="https://acme.com/logo.png" type="url" hint="Full URL to your logo image" />
      <TextareaField label="Description" value={fields.description} onChange={set("description")} placeholder="Brief description of your organisation..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" value={fields.phone} onChange={set("phone")} placeholder="+44 20 1234 5678" type="tel" />
        <Field label="Email" value={fields.email} onChange={set("email")} placeholder="hello@acme.com" type="email" />
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-3 mb-2 uppercase tracking-wide">Social Profiles</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="LinkedIn" value={fields.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/company/acme" type="url" />
          <Field label="Twitter / X" value={fields.twitter} onChange={set("twitter")} placeholder="https://x.com/acme" type="url" />
          <Field label="Facebook" value={fields.facebook} onChange={set("facebook")} placeholder="https://facebook.com/acme" type="url" />
          <Field label="Instagram" value={fields.instagram} onChange={set("instagram")} placeholder="https://instagram.com/acme" type="url" />
        </div>
      </div>
    </div>
  );
}

const LOCAL_DEFAULTS: LocalBizFields = {
  ...ORG_DEFAULTS,
  streetAddress: "", city: "", state: "", postalCode: "", country: "GB",
  openingHours: "", priceRange: "", latitude: "", longitude: "",
};

function LocalBizForm({ fields, onChange }: { fields: LocalBizFields; onChange: (f: LocalBizFields) => void }) {
  const set = (key: keyof LocalBizFields) => (v: string) => onChange({ ...fields, [key]: v });
  return (
    <div className="space-y-6">
      <OrgForm fields={fields} onChange={f => onChange({ ...fields, ...f })} />
      <div>
        <p className="text-xs font-semibold text-ink-3 mb-3 uppercase tracking-wide">Address</p>
        <div className="space-y-3">
          <Field label="Street Address" value={fields.streetAddress} onChange={set("streetAddress")} placeholder="123 High Street" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="City" value={fields.city} onChange={set("city")} placeholder="London" />
            <Field label="State / Region" value={fields.state} onChange={set("state")} placeholder="England" />
            <Field label="Postal Code" value={fields.postalCode} onChange={set("postalCode")} placeholder="SW1A 1AA" />
            <Field label="Country" value={fields.country} onChange={set("country")} placeholder="GB" hint="ISO 2-letter" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Opening Hours" value={fields.openingHours} onChange={set("openingHours")} placeholder="Mo-Fr 09:00-17:00" hint="Schema.org format" />
        <Field label="Price Range" value={fields.priceRange} onChange={set("priceRange")} placeholder="EE" hint="E.g. $, $$, EEE" />
      </div>
      <div>
        <p className="text-xs font-semibold text-ink-3 mb-2 uppercase tracking-wide">Geo Coordinates (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" value={fields.latitude} onChange={set("latitude")} placeholder="51.5074" />
          <Field label="Longitude" value={fields.longitude} onChange={set("longitude")} placeholder="-0.1278" />
        </div>
      </div>
    </div>
  );
}

function FAQForm({ items, onChange }: { items: FAQItem[]; onChange: (items: FAQItem[]) => void }) {
  const update = (i: number, key: keyof FAQItem, v: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const add = () => { if (items.length < 10) onChange([...items, { question: "", answer: "" }]); };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3">{items.length}/10 Q&amp;A pairs</p>
        <button onClick={add} disabled={items.length >= 10}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus className="w-3.5 h-3.5" />Add Question
        </button>
      </div>
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">Q{i + 1}</span>
              <button onClick={() => remove(i)} className="text-ink-4 hover:text-red-500 transition-colors p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">Question</label>
              <input value={item.question} onChange={e => update(i, "question", e.target.value)}
                placeholder="What services do you offer?"
                className="w-full input-field text-sm px-3 py-2 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-2 mb-1">Answer</label>
              <textarea rows={2} value={item.answer} onChange={e => update(i, "answer", e.target.value)}
                placeholder="We offer SEO, web design, and content marketing..."
                className="w-full input-field text-sm px-3 py-2 rounded-xl resize-none" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <MessageSquare className="w-8 h-8 text-ink-4 mx-auto mb-2" />
          <p className="text-sm text-ink-3">Click Add Question to start building your FAQ schema</p>
        </div>
      )}
    </div>
  );
}

type Tab = "organization" | "localbusiness" | "faqpage";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "organization",  label: "Organization",  icon: Building2,     desc: "For any business or brand" },
  { id: "localbusiness", label: "Local Business", icon: MapPin,        desc: "Physical location + hours" },
  { id: "faqpage",       label: "FAQPage",        icon: MessageSquare, desc: "Q&A pairs for rich results" },
];

export default function SchemaGeneratorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("organization");
  const [orgFields, setOrgFields] = useState<OrgFields>(ORG_DEFAULTS);
  const [localFields, setLocalFields] = useState<LocalBizFields>(LOCAL_DEFAULTS);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([{ question: "", answer: "" }]);
  const [copied, setCopied] = useState(false);

  const schema = useCallback(() => {
    if (activeTab === "organization") return buildOrgSchema(orgFields);
    if (activeTab === "localbusiness") return buildLocalBizSchema(localFields);
    return buildFAQSchema(faqItems);
  }, [activeTab, orgFields, localFields, faqItems]);

  const jsonString = JSON.stringify(schema(), null, 2);
  const fullScript = '<script type="application/ld+json">\n' + jsonString + '\n</script>';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}>
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                  <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" fill="none"
                    strokeDasharray="28 16" strokeLinecap="round" transform="rotate(-90 10 10)" />
                  <text x="10" y="14" textAnchor="middle" fontSize="8" fontWeight="800"
                    fill="white" fontFamily="system-ui">S</text>
                </svg>
              </div>
              <span className="font-bold text-ink text-lg tracking-tight group-hover:text-brand transition-colors">
                SiteScore
              </span>
            </Link>
            <ChevronRight className="w-4 h-4 text-ink-4" />
            <span className="text-sm font-semibold text-ink-2">Schema Generator</span>
          </div>
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-2 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />Back to Audit
          </Link>
        </div>
      </header>

      <div className="relative overflow-hidden border-b border-gray-100 bg-white py-10">
        <div className="orb w-96 h-96 opacity-20 -top-32 -left-20"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="orb w-96 h-96 opacity-10 -top-32 -right-20"
          style={{ background: "radial-gradient(circle, #DB2777, transparent)" }} />
        <div className="max-w-content mx-auto px-6 relative">
          <div className="inline-flex items-center gap-2 badge-brand px-3 py-1.5 rounded-full mb-4">
            <Code2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Free Tool - No Account Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink mb-3">
            JSON-LD <span className="gradient-text">Schema Generator</span>
          </h1>
          <p className="text-base text-ink-3 max-w-xl">
            Generate structured data for your website in seconds. Boost rich results in Google Search and improve AI search engine visibility.
          </p>
        </div>
      </div>

      <div className="max-w-content mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            <div className="card rounded-2xl p-1.5 flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === id
                      ? "bg-ai-gradient text-white shadow-sm"
                      : "text-ink-3 hover:text-ink-2 hover:bg-gray-50"
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{label}</span>
                  <span className="sm:hidden">{label.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="card rounded-2xl p-6">
                  {(() => {
                    const t = TABS.find(tab => tab.id === activeTab)!;
                    const Icon = t.icon;
                    return (
                      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.1),rgba(219,39,119,0.06))" }}>
                          <Icon className="w-4 h-4 text-brand" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-ink">{t.label} Schema</h2>
                          <p className="text-xs text-ink-4">{t.desc}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {activeTab === "organization"  && <OrgForm fields={orgFields} onChange={setOrgFields} />}
                  {activeTab === "localbusiness" && <LocalBizForm fields={localFields} onChange={setLocalFields} />}
                  {activeTab === "faqpage"       && <FAQForm items={faqItems} onChange={setFaqItems} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="card rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/70 block" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/70 block" />
                    <span className="w-3 h-3 rounded-full bg-green-400/70 block" />
                  </div>
                  <span className="text-xs font-mono text-ink-4">JSON-LD Preview</span>
                </div>
                <button onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    copied
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-ai-gradient text-white hover:opacity-90"
                  }`}>
                  {copied
                    ? <><Check className="w-3.5 h-3.5" />Copied!</>
                    : <><Copy className="w-3.5 h-3.5" />Copy Script</>}
                </button>
              </div>
              <div className="overflow-auto max-h-96 p-5 bg-gray-50/30">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                  <span className="text-ink-4">{'<script type="application/ld+json">'}</span>
                  {"\n"}
                  <span dangerouslySetInnerHTML={{ __html: highlight(jsonString) }} />
                  {"\n"}
                  <span className="text-ink-4">{"</script>"}</span>
                </pre>
              </div>
            </div>

            <div className="card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-brand" />
                How to add this to your site
              </h3>
              <ol className="space-y-3 text-sm text-ink-2">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>1</span>
                  <span>Click <strong>Copy Script</strong> to copy the full script block</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>2</span>
                  <span>Open your website HTML and find the closing head tag</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>3</span>
                  <span>Paste the script <strong>immediately before</strong> the closing head tag</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#DB2777)" }}>4</span>
                  <span>Validate at <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:text-brand-dark">Google Rich Results Test</a></span>
                </li>
              </ol>
            </div>

            <div className="rounded-2xl p-5 border"
              style={{
                background: "linear-gradient(135deg,rgba(124,58,237,0.05),rgba(219,39,119,0.03))",
                borderColor: "rgba(124,58,237,0.15)",
              }}>
              <p className="text-sm font-bold text-ink mb-1">Want us to implement it for you?</p>
              <p className="text-xs text-ink-3 mb-3">Our team validates and installs your schema live and correct within 48 hours.</p>
              <Link href="/#plans"
                className="inline-flex items-center gap-1.5 btn-gradient text-xs px-4 py-2">
                View Schema Setup Plans <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
