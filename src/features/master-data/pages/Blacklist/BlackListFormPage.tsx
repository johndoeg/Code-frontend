import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';
import { fromApiDate, stripNpwp } from '@/shared/utils/helpers';

type CustomerType = "PR" | "PT";

interface Option { value: string; label: string; disabled?: boolean; }
interface PositionOption { value: string; label: string; is_other: boolean; }

interface Member {
    key: string;
    name: string;
    os_code: string;
    position: string;
    position_other: string;
    shareholder_status: string;
    id_card: string;
    npwp: string;
}

const BLACKLIST_LIST_PATH = '/blacklist-entry';
const SHAREHOLDER_OS_CODE = 'PT01';
const SHAREHOLDER_STATUS_CODES = ['PR', 'PT'];
const REASON_LOCKED = '4';
const REASON_OTHER = '5';
const PR_NAME_PATTERN = /^[a-zA-Z., ]*$/;

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };
const disabledDateStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' };
const disabledOptionStyle: React.CSSProperties = { backgroundColor: '#f1f5f9', color: '#94a3b8' };
const selectStyle: React.CSSProperties = { colorScheme: 'light' };

const inputCls =
    "w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 [color-scheme:light] focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none transition-shadow disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";
const readOnlyCls = "read-only:bg-slate-100";
const selectCls = `${inputCls} [&>option]:bg-white [&>option]:text-slate-900`;
const cellInputCls = inputCls.replace("px-3 py-2", "px-2 py-1.5");
const cellSelectCls = `${cellInputCls} [&>option]:bg-white [&>option]:text-slate-900`;

const dateFieldClass =
    "text-[var(--app-text)] [&_label]:!text-[var(--app-text)] [&_input]:!bg-white " +
    "[&_input]:!text-slate-900 [&_input]:![color-scheme:light] [&_input]:!w-full";

const pad = (n: number) => String(n).padStart(2, '0');

const toApiDate = (d: Date | null): string => {
    if (!d || isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDisplayDate = (d: Date | null): string => {
    if (!d || isNaN(d.getTime())) return "";
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const endOfToday = (): Date => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
};

const NPWP_SEGMENTS = [2, 3, 3, 1, 3, 4];
const NPWP_SEPARATORS = [".", ".", ".", "-", "."];
const NPWP_WIDTHS = ["w-14", "w-16", "w-16", "w-12", "w-16", "w-20"];
const emptyNpwp = (): string[] => NPWP_SEGMENTS.map(() => "");
const splitNpwp = (v: string): string[] => {
    const d = stripNpwp(v || "");
    let pos = 0;
    return NPWP_SEGMENTS.map((len) => {
        const part = d.slice(pos, pos + len);
        pos += len;
        return part;
    });
};

const digitsOnly = (v: string) => v.replace(/\D/g, '');

let memberSeq = 0;
const emptyMember = (): Member => ({
    key: `m${++memberSeq}`,
    name: "", os_code: "", position: "", position_other: "",
    shareholder_status: "", id_card: "", npwp: "",
});

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-[var(--app-text)] mb-1">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const NpwpInput = ({
    parts,
    disabled,
    onChange,
    onBlur,
}: {
    parts: string[];
    disabled: boolean;
    onChange: (parts: string[]) => void;
    onBlur: () => void;
}) => (
    <div className="flex items-center gap-1 flex-wrap">
        {NPWP_SEGMENTS.map((len, i) => (
            <React.Fragment key={i}>
                <input
                    type="text"
                    inputMode="numeric"
                    value={parts[i] ?? ""}
                    maxLength={len}
                    disabled={disabled}
                    onChange={(e) => {
                        const next = [...parts];
                        next[i] = e.target.value.replace(/\D/g, '').slice(0, len);
                        onChange(next);
                    }}
                    onBlur={onBlur}
                    className={`${NPWP_WIDTHS[i]} border border-[var(--app-border)] rounded-md px-1 py-2 text-sm text-center bg-white text-slate-900 [color-scheme:light] focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
                />
                {i < NPWP_SEPARATORS.length && <span className="text-[var(--app-text)]">{NPWP_SEPARATORS[i]}</span>}
            </React.Fragment>
        ))}
    </div>
);

const Warning = ({ text }: { text: string }) =>
    text ? <p className="text-xs text-amber-600 mt-1">{text}</p> : null;

const BlackListFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { no } = useParams();
    const [searchParams] = useSearchParams();

    const recordNo = no ? Number(no) : null;
    const isCreate = !recordNo;
    const menuId = searchParams.get('menu_id') ?? '';
    const returnTo = searchParams.get('return_to') ?? '';
    const requestedView = searchParams.get('mode') === 'view';

    const [readOnlyRecord, setReadOnlyRecord] = useState(false);
    const isView = !isCreate && (requestedView || readOnlyRecord);

    const [customerType, setCustomerType] = useState<CustomerType>("PR");
    const [lesseeCat, setLesseeCat] = useState("");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [npwpParts, setNpwpParts] = useState<string[]>(emptyNpwp());
    const [idCard, setIdCard] = useState("");
    const [dob, setDob] = useState<Date | null>(null);
    const [spouseName, setSpouseName] = useState("");
    const [spouseIdCard, setSpouseIdCard] = useState("");
    const [spouseDob, setSpouseDob] = useState<Date | null>(null);
    const [mother, setMother] = useState("");
    const [establishmentDate, setEstablishmentDate] = useState<Date | null>(null);
    const [contactPerson, setContactPerson] = useState("");
    const [contactAddress, setContactAddress] = useState("");
    const [reasonCategory, setReasonCategory] = useState("");
    const [storedCategory, setStoredCategory] = useState("");
    const [reasonOther, setReasonOther] = useState("");
    const [remark, setRemark] = useState("");
    const [members, setMembers] = useState<Member[]>([]);

    const [createBy, setCreateBy] = useState("");
    const [createDate, setCreateDate] = useState("");
    const [lastUser, setLastUser] = useState("");
    const [lastUpdate, setLastUpdate] = useState("");

    const [reasons, setReasons] = useState<Option[]>([]);
    const [companyProfiles, setCompanyProfiles] = useState<Option[]>([]);
    const [osTypes, setOsTypes] = useState<Record<string, Option[]>>({});
    const [positions, setPositions] = useState<Record<string, PositionOption[]>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [idCardWarning, setIdCardWarning] = useState("");
    const [npwpWarning, setNpwpWarning] = useState("");
    const [spouseIdWarning, setSpouseIdWarning] = useState("");
    const [spouseDobWarning, setSpouseDobWarning] = useState("");
    const [showMembers, setShowMembers] = useState(false);
    const [dateWarnings, setDateWarnings] = useState<Record<string, string>>({});

    const isPR = customerType === 'PR';
    const editable = !isView && !saving;
    const profileLocked = !isView && !isPR && !lesseeCat;
    const gated = !editable || profileLocked;
    const categoryLocked = !isCreate && storedCategory === REASON_LOCKED;
    const typeOptions = isPR ? [] : (osTypes[lesseeCat] ?? []);

    const listPath = menuId ? `${BLACKLIST_LIST_PATH}?menu_id=${encodeURIComponent(menuId)}` : BLACKLIST_LIST_PATH;
    const backPath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : listPath;
    const excludeParams = recordNo ? { exclude_no: String(recordNo) } : {};

    const loadPage = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const optionsReq = api.get('/MasterData/blacklist/options', { params: { mode: recordNo ? 'edit' : 'create' } });
            const detailReq = recordNo
                ? api.get(`/MasterData/blacklist/${recordNo}`)
                : Promise.resolve(null);

            const [optionsRes, detailRes] = await Promise.all([optionsReq, detailReq]);
            const o = optionsRes.data;

            setReasons(o.reasons ?? []);
            setCompanyProfiles(o.company_profiles ?? []);
            setOsTypes(o.os_types ?? {});
            setPositions(o.positions ?? {});

            if (!detailRes) {
                setCreateBy(o.current_user ?? "");
                setCreateDate(o.today ?? "");
                setMembers([emptyMember()]);
                return;
            }

            const d = detailRes.data;
            setCustomerType(d.customer_type === 'PT' ? 'PT' : 'PR');
            setLesseeCat(d.lessee_cat ?? "");
            setName(d.name ?? "");
            setAddress(d.address ?? "");
            setPhone(d.phone ?? "");
            setNpwpParts(splitNpwp(d.npwp ?? ""));
            setIdCard(d.id_card ?? "");
            setDob(fromApiDate(d.dob));
            setSpouseName(d.spouse_name ?? "");
            setSpouseIdCard(d.spouse_idcard ?? "");
            setSpouseDob(fromApiDate(d.spouse_dob));
            setMother(d.mother ?? "");
            setEstablishmentDate(fromApiDate(d.establishment_date));
            setContactPerson(d.contact_person ?? "");
            setContactAddress(d.contact_address ?? "");
            setReasonCategory(d.reason_category ?? "");
            setStoredCategory(d.reason_category ?? "");
            setReasonOther(d.reason_other ?? "");
            setRemark(d.remark ?? "");
            setCreateBy(d.create_by ?? "");
            setCreateDate(d.create_date ?? "");
            setLastUser(d.last_user ?? "");
            setLastUpdate(d.last_update ?? "");
            setReadOnlyRecord(Boolean(d.apless) || Boolean(d.deleted));

            const loaded: Member[] = (d.members ?? []).map((m: any) => ({
                ...emptyMember(),
                name: m.name ?? "",
                os_code: m.os_code ?? "",
                position: m.position ?? "",
                position_other: m.position_other ?? "",
                shareholder_status: m.shareholder_status ?? "",
                id_card: m.id_card ?? "",
                npwp: m.npwp ?? "",
            }));
            setMembers(loaded.length ? loaded : [emptyMember()]);
        } catch (err: any) {
            setLoadError(
                err?.response?.status === 404
                    ? "Record not found."
                    : "Failed to load blacklist data. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [recordNo]);

    useEffect(() => { loadPage(); }, [loadPage]);

    const runCheck = async (
        url: string,
        params: Record<string, string>,
        setWarning: (v: string) => void,
        clear: () => void,
    ) => {
        try {
            const { data } = await api.get(url, { params: { ...params, ...excludeParams } });
            if (data.ok) {
                setWarning("");
                return;
            }
            setWarning(data.message || "");
            clear();
        } catch {
            setWarning("");
        }
    };

    const checkIdCard = () => {
        const value = idCard.trim();
        if (isView || !value) { setIdCardWarning(""); return; }
        runCheck('/MasterData/blacklist/validate/id-card', { id_card: value }, setIdCardWarning, () => setIdCard(""));
    };

    const checkNpwp = () => {
        const value = npwpParts.join("");
        if (isView || !value) { setNpwpWarning(""); return; }
        runCheck('/MasterData/blacklist/validate/npwp', { npwp: value }, setNpwpWarning, () => setNpwpParts(emptyNpwp()));
    };

    const checkSpouseIdCard = () => {
        const value = spouseIdCard.trim();
        if (isView || !value) { setSpouseIdWarning(""); return; }
        runCheck('/MasterData/blacklist/validate/spouse-id-card', { spouse_idcard: value }, setSpouseIdWarning, () => setSpouseIdCard(""));
    };

    const checkSpouseDob = (nameValue: string, dobValue: Date | null) => {
        const dobIso = toApiDate(dobValue);
        if (isView || !nameValue.trim() || !dobIso) { setSpouseDobWarning(""); return; }
        runCheck(
            '/MasterData/blacklist/validate/spouse-dob',
            { spouse_name: nameValue.trim(), spouse_dob: dobIso },
            setSpouseDobWarning,
            () => setSpouseDob(null),
        );
    };

    const resetTypeFields: Partial<Member> = { os_code: "", position: "", position_other: "", shareholder_status: "", npwp: "" };

    const changeLesseeCat = (value: string) => {
        setLesseeCat(value);
        const allowed = (osTypes[value] ?? []).map((t) => t.value);
        setMembers((prev) => prev.map((m) => (allowed.includes(m.os_code) ? m : { ...m, ...resetTypeFields })));
    };

    const updateMember = (key: string, patch: Partial<Member>) => {
        setMembers((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
    };

    const isOtherPosition = (m: Member) =>
        (positions[m.os_code] ?? []).some((p) => p.value === m.position && p.is_other);

    const shareholderEnabled = (m: Member) => !isPR && m.os_code === SHAREHOLDER_OS_CODE;

    const changeType = (m: Member, os: string) => {
        updateMember(m.key, { ...resetTypeFields, os_code: os });
    };

    const changePosition = (m: Member, value: string) => {
        const other = (positions[m.os_code] ?? []).some((p) => p.value === value && p.is_other);
        updateMember(m.key, other ? { position: value } : { position: value, position_other: "" });
    };

    const changeShareholder = (m: Member, value: string) => {
        updateMember(m.key, value === 'PT'
            ? { shareholder_status: value, id_card: "" }
            : { shareholder_status: value, npwp: "" });
    };

    const addMember = () => setMembers((prev) => [...prev, emptyMember()]);

    const removeMember = (key: string) =>
        setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.key !== key)));

    const validate = (): string[] => {
        const errs: string[] = [];
        if (isPR && !idCard.trim()) errs.push("ID Card must not empty");
        if (!name.trim()) errs.push("Name must not empty");
        else if (isPR && !PR_NAME_PATTERN.test(name.trim())) errs.push("Name only allows letters, dot, comma and space");
        if (!address.trim()) errs.push("Address must not empty");
        if (!isPR && !lesseeCat) errs.push("Company Profile must not empty");
        if (!isPR && npwpParts.some((p) => !p)) errs.push("NPWP must not empty");
        if (!reasonCategory) errs.push("Reason Category must not empty");
        if (reasonCategory === REASON_OTHER && !reasonOther.trim()) errs.push("Reason Other must not empty");

        const limit = endOfToday();
        const mainDate = isPR ? dob : establishmentDate;
        if (mainDate && mainDate > limit) errs.push("DOB / Establishment Date not valid");
        if (isPR && spouseDob && spouseDob > limit) errs.push("Spouse Date of Birth not valid");

        if (!isPR) {
            const allowed = typeOptions.map((t) => t.value);
            members.forEach((m, i) => {
                const memberName = m.name.trim();
                if (!memberName) {
                    if (m.id_card.trim() || m.npwp.trim()) {
                        errs.push(`Row ${i + 1} has details but no Name. Enter the Name in the BOD / BOC grid or clear the row.`);
                    }
                    return;
                }
                if (!m.os_code) {
                    errs.push(`Type must be selected for ${memberName}`);
                    return;
                }
                if (!allowed.includes(m.os_code)) {
                    errs.push(`Type is not valid for the selected Company Profile (${memberName})`);
                }
            });
        }
        return errs;
    };

    const buildPayload = () => ({
        customer_type: customerType,
        lessee_cat: isPR ? "" : lesseeCat,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        npwp: npwpParts.join(""),
        id_card: isPR ? idCard.trim() : "",
        dob: isPR ? toApiDate(dob) : "",
        spouse_name: isPR ? spouseName.trim() : "",
        spouse_idcard: isPR ? spouseIdCard.trim() : "",
        spouse_dob: isPR ? toApiDate(spouseDob) : "",
        mother: isPR ? mother.trim() : "",
        establishment_date: isPR ? "" : toApiDate(establishmentDate),
        contact_person: isPR ? "" : contactPerson.trim(),
        contact_address: isPR ? "" : contactAddress.trim(),
        reason_category: reasonCategory,
        reason_other: reasonOther.trim(),
        remark: remark.trim(),
        members: isPR ? [] : members.map((m) => ({
            name: m.name.trim(),
            os_code: m.os_code,
            position: m.position,
            position_other: isOtherPosition(m) ? m.position_other.trim() : "",
            shareholder_status: shareholderEnabled(m) && SHAREHOLDER_STATUS_CODES.includes(m.shareholder_status) ? m.shareholder_status : "",
            id_card: m.id_card.trim(),
            npwp: m.npwp.trim(),
        })),
    });

    const handleSave = async () => {
        const errs = validate();
        if (errs.length) {
            setErrors(errs);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSaving(true);
        setErrors([]);
        try {
            const fd = new FormData();
            fd.append('data', JSON.stringify(buildPayload()));
            if (isCreate) {
                await api.post('/MasterData/blacklist', fd);
            } else {
                await api.put(`/MasterData/blacklist/${recordNo}`, fd);
            }
            navigate(listPath);
        } catch (err: any) {
            const res = err?.response?.data;
            setErrors(Array.isArray(res?.errors) && res.errors.length
                ? res.errors
                : [res?.error || "Save failed. Please try again."]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    const title = useMemo(
        () => (isCreate ? "Add Blacklist" : isView ? "Blacklist Detail" : "Edit Blacklist"),
        [isCreate, isView]
    );

    const renderDate = (
        field: string,
        value: Date | null,
        onChange: (d: Date | null) => void,
        disabled: boolean,
    ) =>
        disabled ? (
            <input type="text" value={toDisplayDate(value)} disabled placeholder="dd-mm-yyyy"
                style={disabledDateStyle} className={inputCls} />
        ) : (
            <>
                <div className={dateFieldClass}>
                    <AsOfDatePickerComponent
                        label=""
                        value={value}
                        maxDate={new Date()}
                        onChange={(d: Date | null) => {
                            if (d && d > endOfToday()) {
                                setDateWarnings((w) => ({ ...w, [field]: "Max date today" }));
                                onChange(null);
                                return;
                            }
                            setDateWarnings((w) => ({ ...w, [field]: "" }));
                            onChange(d);
                        }}
                    />
                </div>
                <Warning text={dateWarnings[field] ?? ""} />
            </>
        );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--app-surface)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
            <div className="max-w-full mx-auto space-y-6">

                <div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">{title}</h1>
                            <p className="text-[var(--app-text)] mt-1 text-sm">
                                {isView ? "Read-only view of a blacklisted customer" : "Individual (PR) or Corporate (PT) customer"}
                            </p>
                        </div>
                        {!isCreate && (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium self-start">
                                No. {recordNo}
                            </span>
                        )}
                    </div>

                    {loadError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {loadError}
                            <button onClick={loadPage} className="ml-4 underline text-red-900">Retry</button>
                            <button onClick={() => navigate(backPath)} className="ml-4 underline text-red-900">Back</button>
                        </div>
                    )}

                    {errors.length > 0 && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <ul className="list-disc list-inside space-y-1">
                                {errors.map((e, i) => <li key={i} className="text-sm text-red-600">{e}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--app-text)] mb-2">
                                    Customer Type<span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="flex gap-6">
                                    {(["PR", "PT"] as CustomerType[]).map((t) => (
                                        <label key={t} className={`flex items-center gap-2 text-sm ${isCreate ? "cursor-pointer" : "opacity-60"}`}>
                                            <input
                                                type="radio"
                                                checked={customerType === t}
                                                disabled={!isCreate || saving}
                                                onChange={() => setCustomerType(t)}
                                                className="accent-red-600"
                                            />
                                            {t === "PR" ? "Individual" : "Corporate"}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {!isPR && (
                                <Field label="Company Profile" required>
                                    <select value={lesseeCat} disabled={!editable} style={selectStyle}
                                        onChange={(e) => changeLesseeCat(e.target.value)} className={selectCls}>
                                        <option value="" style={optionStyle}>Select</option>
                                        {companyProfiles.map((p) => (
                                            <option key={p.value} value={p.value} style={optionStyle}>{p.label}</option>
                                        ))}
                                    </select>
                                    {profileLocked && <p className="text-xs text-red-600 mt-1">select this first</p>}
                                </Field>
                            )}

                            <Field label="Name" required>
                                <input type="text" value={name} maxLength={200} disabled={gated}
                                    onChange={(e) => setName(e.target.value)} className={inputCls} />
                            </Field>

                            <Field label="Address" required>
                                <textarea value={address} rows={2} maxLength={250} disabled={gated}
                                    onChange={(e) => setAddress(e.target.value)} className={`${inputCls} resize-none`} />
                            </Field>

                            <Field label="Phone">
                                <input type="text" inputMode="numeric" value={phone} disabled={gated}
                                    onChange={(e) => setPhone(digitsOnly(e.target.value))} className={inputCls} />
                            </Field>

                            {isPR ? (
                                <>
                                    <Field label="ID Card No." required>
                                        <input type="text" inputMode="numeric" value={idCard} maxLength={40} disabled={!editable}
                                            onChange={(e) => { setIdCard(digitsOnly(e.target.value)); setIdCardWarning(""); }}
                                            onBlur={checkIdCard} className={inputCls} />
                                        <Warning text={idCardWarning} />
                                    </Field>

                                    <Field label="Date of Birth">
                                        {renderDate("dob", dob, setDob, !editable)}
                                    </Field>

                                    <Field label="NPWP">
                                        <NpwpInput parts={npwpParts} disabled={!editable}
                                            onChange={(p) => { setNpwpParts(p); setNpwpWarning(""); }}
                                            onBlur={checkNpwp} />
                                        <Warning text={npwpWarning} />
                                    </Field>

                                    <Field label="Spouse Name">
                                        <input type="text" value={spouseName} maxLength={200} disabled={!editable}
                                            onChange={(e) => { setSpouseName(e.target.value); setSpouseDobWarning(""); }}
                                            onBlur={() => checkSpouseDob(spouseName, spouseDob)} className={inputCls} />
                                    </Field>

                                    <Field label="Spouse ID Card No.">
                                        <input type="text" inputMode="numeric" value={spouseIdCard} maxLength={30} disabled={!editable}
                                            onChange={(e) => { setSpouseIdCard(digitsOnly(e.target.value)); setSpouseIdWarning(""); }}
                                            onBlur={checkSpouseIdCard} className={inputCls} />
                                        <Warning text={spouseIdWarning} />
                                    </Field>

                                    <Field label="Spouse Date of Birth">
                                        {renderDate("spouse_dob", spouseDob, (d) => {
                                            setSpouseDob(d);
                                            setSpouseDobWarning("");
                                            checkSpouseDob(spouseName, d);
                                        }, !editable)}
                                        <Warning text={spouseDobWarning} />
                                    </Field>

                                    <Field label="Mother's Maiden Name">
                                        <input type="text" value={mother} maxLength={200} disabled={!editable}
                                            onChange={(e) => setMother(e.target.value)} className={inputCls} />
                                    </Field>
                                </>
                            ) : (
                                <>
                                    <Field label="NPWP" required>
                                        <NpwpInput parts={npwpParts} disabled={gated}
                                            onChange={(p) => { setNpwpParts(p); setNpwpWarning(""); }}
                                            onBlur={checkNpwp} />
                                        <Warning text={npwpWarning} />
                                    </Field>

                                    <Field label="Establishment Date">
                                        {renderDate("establishment_date", establishmentDate, setEstablishmentDate, gated)}
                                    </Field>

                                    <p className="text-sm font-semibold underline text-[var(--app-text)] pt-2">Contact person</p>

                                    <Field label="Name">
                                        <input type="text" value={contactPerson} maxLength={200} disabled={gated}
                                            onChange={(e) => setContactPerson(e.target.value)} className={inputCls} />
                                    </Field>

                                    <Field label="Address">
                                        <textarea value={contactAddress} rows={2} maxLength={250} disabled={gated}
                                            onChange={(e) => setContactAddress(e.target.value)} className={`${inputCls} resize-none`} />
                                    </Field>

                                    <Field label="Composition of BOD / BOC">
                                        <button
                                            type="button"
                                            onClick={() => setShowMembers(true)}
                                            disabled={profileLocked}
                                            className="border border-[var(--app-border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--app-surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            View
                                        </button>
                                    </Field>
                                </>
                            )}
                        </div>

                        <div className="space-y-4">
                            <Field label="Reason" required>
                                <select value={reasonCategory} disabled={gated || categoryLocked}
                                    style={gated || categoryLocked ? { ...selectStyle, ...disabledOptionStyle } : selectStyle}
                                    onChange={(e) => setReasonCategory(e.target.value)} className={selectCls}>
                                    <option value="" style={optionStyle}>Select</option>
                                    {reasons.map((r) => (
                                        <option key={r.value} value={r.value} disabled={r.disabled && r.value !== reasonCategory} style={r.disabled ? disabledOptionStyle : optionStyle}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            {reasonCategory === REASON_OTHER && (
                                <Field label="Reason Other" required>
                                    <textarea value={reasonOther} rows={2} disabled={gated}
                                        onChange={(e) => setReasonOther(e.target.value)} className={`${inputCls} resize-none`} />
                                </Field>
                            )}

                            <Field label="Remark">
                                <textarea value={remark} rows={2} disabled={gated}
                                    onChange={(e) => setRemark(e.target.value)} className={`${inputCls} resize-none`} />
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Create By">
                                    <input type="text" value={createBy} disabled className={inputCls} />
                                </Field>
                                <Field label="Create Date">
                                    <input type="text" value={createDate} disabled className={inputCls} />
                                </Field>
                                {!isCreate && lastUser && lastUpdate && (
                                    <>
                                        <Field label="Update by">
                                            <input type="text" value={lastUser} disabled className={inputCls} />
                                        </Field>
                                        <Field label="Last Update">
                                            <input type="text" value={lastUpdate} disabled className={inputCls} />
                                        </Field>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg px-6 py-4 flex justify-end gap-3">
                    <button onClick={() => navigate(backPath)} disabled={saving}
                        className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors">
                        {isView ? "Back" : "Cancel"}
                    </button>
                    {!isView && (
                        <button onClick={handleSave} disabled={saving || profileLocked}
                            className={`px-5 py-2 rounded-lg text-sm text-white font-medium transition-colors ${saving || profileLocked ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}>
                            {saving ? "Saving…" : "Save"}
                        </button>
                    )}
                </div>
            </div>

            {showMembers && !isPR && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-2xl w-full max-w-7xl my-8">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--app-border)]">
                            <h2 className="text-base font-bold text-[var(--app-text)]">
                                COMPOSITION THE BOARD OF DIRECTORS (BOD) &amp; BOARD OF COMMISIONERS (BOC) / SUSUNAN DIREKSI &amp; DEWAN KOMISARIS
                            </h2>
                            <button onClick={() => setShowMembers(false)}
                                className="text-[var(--app-text)] hover:opacity-70 text-2xl leading-none ml-4">
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
                                            <tr>
                                                {[["No.", "4%"], ["Name", "22%"], ["Type", "16%"], ["Position", "18%"], ["Position Other", "18%"], ["Shareholder Status", "18%"], ["", "4%"]].map(([h, w]) => (
                                                    <th key={h || "action"} style={{ width: w }}
                                                        className="py-3 px-3 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--app-border)]">
                                            {members.map((m, i) => (
                                                <tr key={m.key} className="align-top">
                                                    <td className="py-2 px-3 text-sm text-center text-[var(--app-text)]">{i + 1}</td>
                                                    <td className="py-2 px-3">
                                                        <input type="text" value={m.name} maxLength={200} disabled={!editable}
                                                            onChange={(e) => updateMember(m.key, { name: e.target.value })}
                                                            className={`${cellInputCls} min-w-[10rem]`} />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <select value={m.os_code} disabled={!editable} style={selectStyle}
                                                            onChange={(e) => changeType(m, e.target.value)}
                                                            className={`${cellSelectCls} min-w-[9rem]`}>
                                                            <option value="" style={optionStyle}>Select</option>
                                                            {typeOptions.map((t) => (
                                                                <option key={t.value} value={t.value} style={optionStyle}>{t.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <select value={m.position} disabled={!editable} style={selectStyle}
                                                            onChange={(e) => changePosition(m, e.target.value)}
                                                            className={`${cellSelectCls} min-w-[9rem]`}>
                                                            <option value="" style={optionStyle}>Select</option>
                                                            {(positions[m.os_code] ?? []).map((p) => (
                                                                <option key={p.value} value={p.value} style={optionStyle}>{p.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <input type="text" value={m.position_other} maxLength={500}
                                                            disabled={!editable}
                                                            readOnly={!isOtherPosition(m)}
                                                            onChange={(e) => updateMember(m.key, { position_other: e.target.value })}
                                                            className={`${cellInputCls} ${readOnlyCls} min-w-[8rem]`} />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <select value={m.shareholder_status}
                                                            disabled={!editable || !shareholderEnabled(m)} style={selectStyle}
                                                            onChange={(e) => changeShareholder(m, e.target.value)}
                                                            className={`${cellSelectCls} min-w-[7rem]`}>
                                                            <option value="" style={optionStyle}>Select</option>
                                                            {SHAREHOLDER_STATUS_CODES.map((c) => (
                                                                <option key={c} value={c} style={optionStyle}>{c}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                        {editable && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeMember(m.key)}
                                                                disabled={members.length <= 1}
                                                                title={members.length <= 1 ? "At least one row is required." : "Remove row"}
                                                                className="w-7 h-7 border border-[var(--app-border)] rounded-md text-sm hover:bg-[var(--app-surface)] disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                −
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {editable && (
                                    <button type="button" onClick={addMember}
                                        className="mt-3 border border-[var(--app-border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--app-surface)] transition-colors">
                                        + Add Row
                                    </button>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-[var(--app-text)] mb-3">MANAGEMENT DETAIL INFORMATION</h3>
                                <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
                                            <tr>
                                                {[["No.", "6%"], ["Name", "34%"], ["ID Card", "30%"], ["NPWP", "30%"]].map(([h, w]) => (
                                                    <th key={h} style={{ width: w }}
                                                        className="py-3 px-3 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--app-border)]">
                                            {members.map((m, i) => {
                                                const companyHolder = m.shareholder_status === 'PT';
                                                return (
                                                    <tr key={m.key}>
                                                        <td className="py-2 px-3 text-sm text-center text-[var(--app-text)]">{i + 1}</td>
                                                        <td className="py-2 px-3">
                                                            <input type="text" value={m.name} readOnly disabled={!editable} className={`${cellInputCls} ${readOnlyCls}`} />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <input type="text" inputMode="numeric" value={m.id_card} maxLength={40}
                                                                disabled={!editable || companyHolder}
                                                                onChange={(e) => updateMember(m.key, { id_card: digitsOnly(e.target.value) })}
                                                                className={`${cellInputCls} text-right`} />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <input type="text" inputMode="numeric" value={m.npwp} maxLength={30}
                                                                disabled={!editable || !companyHolder}
                                                                onChange={(e) => updateMember(m.key, { npwp: digitsOnly(e.target.value) })}
                                                                className={`${cellInputCls} text-right`} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end px-6 py-4 border-t border-[var(--app-border)] bg-[var(--app-surface)] rounded-b-2xl">
                            <button onClick={() => setShowMembers(false)}
                                className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-alt)] transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlackListFormPage;