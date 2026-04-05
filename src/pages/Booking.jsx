// src/pages/Booking.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roomAPI } from "../services/rooms.js";
import { reservationsAPI } from "../services/reservations.js";

/* ===================== CONFIG ===================== */

const FLOOR_LABEL = {
  2: "ห้องประชุม",
  3: "สาขาวิชาครุศาสตร์โยธา",
  4: "สาขาวิชาครุศาสตร์เครื่องกล",
  5: "สาขาวิชาครุศาสตร์ไฟฟ้า",
  6: "สาขาวิชาวิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย",
  7: "สาขาวิชาครุศาสตร์อุตสาหการ",
  8: "สาขาวิชาเทคโนโลยีบรรจุภัณฑ์และการพิมพ์",
  9: "สาขาวิชาวิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย",
};
const FLOORS = Object.keys(FLOOR_LABEL).map(Number);

const SLOTS = buildHourlySlots("07:30", "20:30");
const TIME_POINTS = buildTimePoints("07:30", "20:30");


const TYPES = ["Lecture", "Computer Lab", "Seminar", "Workshop", "Electronics Lab"];

function roomsOfFloor(floor) {
  const caps = [60, 30, 20, 24, 16];
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${floor}-${i + 1}`,
    name: `Room ${i + 1}`,
    type: TYPES[i],
    capacity: caps[i],
  }));
}


/* ===================== PAGE ===================== */
export default function Booking() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [needDateHint, setNeedDateHint] = useState(false);

  // Step control (1–4)
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [fade, setFade] = useState(true);

  // Mode: time-first / room-first
  const [mode, setMode] = useState("time-first"); // "time-first" | "room-first"
  const isTimeFirst = mode === "time-first";

  // Step 1 / 2
  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState(null);
  const [slotEnd, setSlotEnd] = useState(null);

  // Floor
  const [floor, setFloor] = useState("");

  // Filters
  const [minCap, setMinCap] = useState(0);
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [roomKeyword, setRoomKeyword] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("capacity");
  const [sortOrder, setSortOrder] = useState("desc");

  // Room selection
  const [selected, setSelected] = useState(null);

  // Add-ons
  const [addons, setAddons] = useState({});
  const [addonOptions, setAddonOptions] = useState([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsError, setAddonsError] = useState("");
  const [roomsFromApi, setRoomsFromApi] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");
  const [availabilityByRoom, setAvailabilityByRoom] = useState({});
  const [busySlotByIndex, setBusySlotByIndex] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [approvedHoursToday, setApprovedHoursToday] = useState(0);
  const [reservationError, setReservationError] = useState("");
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [createdReservationStatus, setCreatedReservationStatus] = useState("");
  const [createdReservationMessage, setCreatedReservationMessage] = useState("");

  const hasDate = !!date;
  const hasTimeRange = slotStart !== null && slotEnd !== null;
  const userRole = (localStorage.getItem("authRole") || "student").toLowerCase();
  const isStudent = !["teacher", "admin", "super_admin"].includes(userRole);

  // เงื่อนไขไป step ต่อไป แยกตามโหมด
  const canNextFromStep1 = isTimeFirst
    ? hasDate && hasTimeRange // โหมดเลือกเวลาก่อน → ต้องมีวัน+ช่วงเวลา
    : !!floor && !!selected; // โหมดเลือกห้องก่อน → ต้องเลือกชั้น + ห้องแล้ว

  const canNextFromStep2 = isTimeFirst
    ? !!floor // โหมดเลือกเวลาก่อน → step2 คือเลือกชั้น
    : hasDate && hasTimeRange; // โหมดเลือกห้องก่อน → step2 คือเลือกเวลา

  const canPickFloor = isTimeFirst ? canNextFromStep1 : true; // room-first เลือกชั้นได้เลย
  const canShowRooms = !!floor; // แสดงห้องเมื่อเลือกชั้นแล้วในทุกโหมด

  const startIdx = hasTimeRange ? Math.min(slotStart, slotEnd) : null;
  const endIdx = hasTimeRange ? Math.max(slotStart, slotEnd) : null;
  const timeRangeLabel = hasTimeRange
    ? `Start ${TIME_POINTS[startIdx].display} · End ${TIME_POINTS[endIdx].display}`
    : "";
  const selectedHours = hasTimeRange ? endIdx - startIdx : 0;
  const exceedsStudentDailyLimit = isStudent && approvedHoursToday + selectedHours > 2;

  useEffect(() => {
    let ignore = false;

    async function loadRooms() {
      if (!floor) {
        setRoomsFromApi([]);
        setRoomsError("");
        setRoomsLoading(false);
        return;
      }

      setRoomsLoading(true);
      setRoomsError("");

      try {
        const result = await roomAPI.list({
          q: roomKeyword || undefined,
          type: typeFilter === "ทั้งหมด" ? undefined : typeFilter,
          floor,
          location: locationFilter || undefined,
          minCapacity: minCap > 0 ? minCap : undefined,
          page: 1,
          limit: 100,
          sortBy,
          sortOrder,
        });
        const rooms = result.items;
        if (!ignore) {
          setRoomsFromApi(rooms);
          setSelected((prev) => {
            if (!prev) return prev;
            return rooms.some((r) => r.id === prev.id) ? prev : null;
          });
        }
      } catch (error) {
        if (!ignore) {
          setRoomsFromApi([]);
          setRoomsError(error?.message || "Cannot load rooms from backend.");
        }
      } finally {
        if (!ignore) setRoomsLoading(false);
      }
    }

    loadRooms();

    return () => {
      ignore = true;
    };
  }, [floor, roomKeyword, locationFilter, typeFilter, minCap, sortBy, sortOrder]);

  const roomsRaw = useMemo(() => {
    if (!floor) return [];
    if (roomsFromApi.length) {
      return roomsFromApi.filter((room) => !room.floor || room.floor === String(floor));
    }
    return roomsOfFloor(floor);
  }, [floor, roomsFromApi]);
  const roomsFiltered = useMemo(() => {
    let list = roomsRaw;
    if (minCap > 0) list = list.filter((r) => r.capacity >= Number(minCap));
    if (typeFilter !== "ทั้งหมด") list = list.filter((r) => r.type === typeFilter);
    return list;
  }, [roomsRaw, minCap, typeFilter]);

  useEffect(() => {
    let ignore = false;

    async function loadAvailability() {
      if (!date || !hasTimeRange || !roomsRaw.length) {
        setAvailabilityByRoom({});
        return;
      }

      setAvailabilityLoading(true);
      try {
        const selectedStart = getPointISO(date, startIdx);
        const selectedEnd = getPointISO(date, endIdx);

        const rows = await Promise.all(
          roomsRaw.map(async (room) => {
            const roomId = getReservationRoomId(room);
            if (!roomId) return [room.id, { busy: false }];

            const data = await reservationsAPI.availability(roomId, date);
            const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
            const busy = blocks.some((block) => {
              if (block.isFree) return false;
              return hasOverlap(selectedStart, selectedEnd, block.start, block.end);
            });
            return [room.id, { busy }];
          })
        );

        if (!ignore) setAvailabilityByRoom(Object.fromEntries(rows));
      } catch {
        if (!ignore) setAvailabilityByRoom({});
      } finally {
        if (!ignore) setAvailabilityLoading(false);
      }
    }

    loadAvailability();
    return () => {
      ignore = true;
    };
  }, [date, hasTimeRange, startIdx, endIdx, roomsRaw]);

  useEffect(() => {
    let ignore = false;

    async function loadBusySlotsForSelectedRoom() {
      if (!selected?.id || !date) {
        setBusySlotByIndex({});
        return;
      }

      const roomId = getReservationRoomId(selected);
      if (!roomId) {
        setBusySlotByIndex({});
        return;
      }

      try {
        const data = await reservationsAPI.availability(roomId, date);
        const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
        if (!ignore) {
          setBusySlotByIndex(deriveBusySlotByIndex(blocks, date));
        }
      } catch {
        if (!ignore) setBusySlotByIndex({});
      }
    }

    loadBusySlotsForSelectedRoom();
    return () => {
      ignore = true;
    };
  }, [selected?.id, date]);

  useEffect(() => {
    let ignore = false;

    async function loadApprovedHours() {
      if (!isStudent || !date) {
        setApprovedHoursToday(0);
        return;
      }

      try {
        const rows = await reservationsAPI.list({ date, status: "approved" });
        const currentEmail = (localStorage.getItem("authEmail") || "").toLowerCase();
        const ownRows = rows.filter((row) => {
          const rowEmail = String(row?.user?.email || "").toLowerCase();
          if (!currentEmail || !rowEmail) return true;
          return rowEmail === currentEmail;
        });

        const total = ownRows.reduce((sum, row) => {
          const start = new Date(row.start || row.startTime || 0).getTime();
          const end = new Date(row.end || row.endTime || 0).getTime();
          if (!start || !end || end <= start) return sum;
          return sum + (end - start) / 3600000;
        }, 0);
        if (!ignore) setApprovedHoursToday(total);
      } catch {
        if (!ignore) setApprovedHoursToday(0);
      }
    }

    loadApprovedHours();
    return () => {
      ignore = true;
    };
  }, [date, isStudent]);

  useEffect(() => {
    let ignore = false;

    async function loadAddonsByType() {
      if (!selected?.type) {
        setAddonOptions([]);
        setAddonsError("");
        return;
      }

      setAddonsLoading(true);
      setAddonsError("");
      try {
        const items = await roomAPI.listAddons(selected.type);
        if (!ignore) {
          setAddonOptions(items);
          const valid = new Set(items.map((a) => a.addOnId));
          setAddons((prev) => {
            const next = {};
            Object.entries(prev).forEach(([id, qty]) => {
              if (valid.has(id)) next[id] = qty;
            });
            return next;
          });
        }
      } catch (err) {
        if (!ignore) {
          setAddonOptions([]);
          setAddonsError(err?.message || "Cannot load add-ons.");
        }
      } finally {
        if (!ignore) setAddonsLoading(false);
      }
    }

    loadAddonsByType();
    return () => {
      ignore = true;
    };
  }, [selected?.type]);

  function resetLower() {
    if (isTimeFirst) {
      // เลือกเวลาใหม่ → เคลียร์ชั้น/ห้อง/ออปชัน
      setFloor("");
      setSelected(null);
      setAddons({});
    } else {
      // room-first เปลี่ยนเวลา → ไม่ล้างห้อง แต่ล้าง Add-ons
      setAddons({});
    }
  }

  function resetAll() {
    setStep(1);
    setDate("");
    setSlotStart(null);
    setSlotEnd(null);
    setFloor("");
    setMinCap(0);
    setTypeFilter("ทั้งหมด");
    setSelected(null);
    setAddons({});
    setReservationError("");
    setCreatedReservationStatus("");
    setCreatedReservationMessage("");
  }

function onClickSlot(i) {
  if (!date) {
    setNeedDateHint(true);
    setTimeout(() => setNeedDateHint(false), 700);
    return;
  }

  if (slotStart === null || (slotStart !== null && slotEnd !== null)) {
    if (i >= TIME_POINTS.length - 1) return;
    if (busySlotByIndex[i]) return;
    setSlotStart(i);
    setSlotEnd(null);
    resetLower();
    return;
  }

  if (i === slotStart) return;
  const lo = Math.min(slotStart, i);
  const hi = Math.max(slotStart, i) - 1;
  if (hasBusyInRange(lo, hi, busySlotByIndex)) return;

  const normalizedStart = Math.min(slotStart, i);
  const normalizedEnd = Math.max(slotStart, i);
  setSlotStart(normalizedStart);
  setSlotEnd(normalizedEnd);
  resetLower();
}


  function handleSelectRoom(room) {
    setSelected(room);
    setAddons({});
  }

  // navigate steps
  function nextStep() {
    setFade(false);
    setTimeout(() => {
      setStep((s) => Math.min(totalSteps, s + 1));
      setFade(true);
    }, 220);
  }
  function backStep() {
    setFade(false);
    setTimeout(() => {
      setStep((s) => Math.max(1, s - 1));
      setFade(true);
    }, 220);
  }

  async function confirmBooking() {
    if (!selected || !hasDate || !hasTimeRange) return;

    setReservationSubmitting(true);
    setReservationError("");

    try {
      const roomId = getReservationRoomId(selected);
      if (!roomId) {
        setReservationError("Selected room has invalid id for reservation API.");
        setReservationSubmitting(false);
        return;
      }

      const payload = {
        roomId,
        start: getPointISO(date, startIdx),
        end: getPointISO(date, endIdx),
        note: `Booking (${selected.name})`,
        addOns: normalizeAddonsForPayload(addons),
      };
      const response = await reservationsAPI.create(payload);
      const status = response?.reservation?.status || "approved";

      setCreatedReservationStatus(status);
      setCreatedReservationMessage(
        response?.message ||
          (status === "pending"
            ? "Reservation request submitted and pending admin approval"
            : "Reservation created")
      );
      nextStep();
    } catch (err) {
      setReservationError(mapReservationError(err));
    } finally {
      setReservationSubmitting(false);
    }
  }

  /* ===================== UI ===================== */
  return (
    <div className="relative min-h-screen bg-animated bg-glow overflow-hidden text-white">
      {/* Header + Stepper */}
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-col items-center text-center">
          <Stepper
            step={step}
            total={totalSteps}
            labels={
              isTimeFirst
                ? ["Date & Time", "Floor / Dept", "Room & Add-ons", "Success"]
                : ["Floor & Room", "Date & Time", "Add-ons & Confirm", "Success"]
            }
          />

          {/* ปุ่มเลือกโหมด */}
          <div className="mt-4 flex gap-2 text-xs">
            <button
              onClick={() => {
                setMode("time-first");
                resetAll();
              }}
              className={`px-3 py-1.5 rounded-full border transition ${
                isTimeFirst
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              โหมดเลือกเวลา → ห้อง
            </button>
            <button
              onClick={() => {
                setMode("room-first");
                resetAll();
              }}
              className={`px-3 py-1.5 rounded-full border transition ${
                !isTimeFirst
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              โหมดเลือกห้อง → เวลา
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <div
          className={`transition-all duration-500 ${
            fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {/* STEP 1 */}
          {step === 1 && isTimeFirst && (
            <Section title="ขั้นที่ 1 · เลือกวันและช่วงเวลา">
              <p className="text-xs text-slate-400 mb-2">
                เลือกวันที่และช่วงเวลาที่ต้องการจอง (คลิกเริ่ม–สิ้นสุด)
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className={`md:col-span-1 transition-all ${
  needDateHint ? "ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,.6)]" : ""
}`}>

                  <FancyDate
                    value={date}
                    min={today}
                    onChange={(iso) => {
                      setDate(iso);
                      setSlotStart(null);
                      setSlotEnd(null);
                      resetLower();
                    }}
                  />
                </Card>
                <Card className="md:col-span-2">
                  <Label>Time</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TIME_POINTS.map((point, i) => {
                      const isLastPoint = i >= TIME_POINTS.length - 1;
                      const isBusySlot = !isLastPoint && !!busySlotByIndex[i];
                      const isEndOnlyPoint = isLastPoint && slotStart === null;
                      const isSel =
                        (slotStart === i && slotEnd === null) ||
                        (startIdx !== null && endIdx !== null && i >= startIdx && i <= endIdx);
                      return (
                        <button
                          key={point.value}
                          disabled={isBusySlot || isEndOnlyPoint}
                          onClick={() => onClickSlot(i)}
                          className={`rounded-xl px-3 py-2 text-sm border transition shadow-sm ${
  isBusySlot
    ? "border-rose-400/60 bg-rose-500/25 text-rose-100 cursor-not-allowed"
    : isEndOnlyPoint
    ? "border-white/20 bg-zinc-800/60 text-slate-300 cursor-not-allowed"
    : needDateHint
    ? "border-red-400 bg-red-500/20 animate-pulse" // ← กระพริบแดง
    : isSel
    ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_12px_rgba(16,185,129,.25)]"
    : "border-white/10 bg-zinc-900/80 hover:bg-zinc-800/80"
}`}

                        >
                          {point.display}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-slate-300/80">
                    {timeRangeLabel ? (
                      <>
                        ช่วงที่เลือก: <b className="text-slate-100">{timeRangeLabel}</b>
                      </>
                    ) : (
                      "Click one block for start time, then click one block for end time"
                    )}
                    {timeRangeLabel && (
                      <button
                        onClick={() => {
                          setSlotStart(null);
                          setSlotEnd(null);
                          resetLower();
                        }}
                        className="ml-2 underline"
                      >
                        ล้างช่วงเวลา
                      </button>
                    )}
                  </div>
                </Card>
              </div>

              <StepActions>
                <div />
                <NextButton onClick={nextStep} disabled={!canNextFromStep1} />
              </StepActions>
            </Section>
          )}

          {step === 1 && !isTimeFirst && (
            <Section title="ขั้นที่ 1 · เลือกชั้น + ห้อง">
              {/* เลือกชั้น */}
              <Card>
                <Label>เลือกชั้น (สาขา)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {FLOORS.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFloor(String(f));
                        setSelected(null);
                      }}
                      className={`rounded-2xl px-3 py-3 text-left border transition ${
                        floor === String(f)
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : "border-white/10 bg-zinc-900/80 hover:bg-zinc-800/80"
                      }`}
                    >
                      <div className="text-xs text-slate-300/80">ชั้น {f}</div>
                      <div className="font-medium text-white">{FLOOR_LABEL[f]}</div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Filter + Rooms */}
              <div className="mt-4">
                <Label>กรองห้อง</Label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {["ทั้งหมด", ...TYPES].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        typeFilter === t
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="mb-2 grid gap-2 md:grid-cols-2">
                  <input
                    value={roomKeyword}
                    onChange={(e) => setRoomKeyword(e.target.value)}
                    placeholder="Keyword (name, description, floor, type, location)"
                    className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                  />
                  <input
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Location"
                    className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                  />
                </div>
                <div className="mb-2 grid gap-2 md:grid-cols-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                  >
                    <option value="name">Sort by name</option>
                    <option value="capacity">Sort by capacity</option>
                    <option value="floor">Sort by floor</option>
                    <option value="type">Sort by type</option>
                    <option value="location">Sort by location</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                  >
                    <option value="asc">ASC</option>
                    <option value="desc">DESC</option>
                  </select>
                </div>

                {!canShowRooms ? (
                  <Card>
                    <div className="text-sm text-slate-300/80">เลือกชั้นก่อนเพื่อดูห้อง</div>
                  </Card>
                ) : roomsLoading ? (
                  <Card>
                    <div className="text-sm text-slate-300/80">กำลังโหลดข้อมูลห้องจาก backend...</div>
                  </Card>
                ) : (
                  <>
                    {roomsError && (
                      <Card className="mb-3 border-amber-300/30 bg-amber-500/10">
                        <div className="text-sm text-amber-100">
                          โหลดข้อมูลห้องจาก backend ไม่สำเร็จ: {roomsError}
                        </div>
                        <div className="text-xs text-amber-200/80 mt-1">ระบบกำลังใช้ข้อมูลสำรองชั่วคราว</div>
                      </Card>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {roomsFiltered.map((room) => {
                        const busy = availabilityByRoom[room.id]?.busy; // ยังไม่เลือกเวลา → undefined
                        const isActive = selected?.id === room.id;
                        return (
                          <article
                            key={room.id}
                            className={`rounded-2xl border p-4 transition backdrop-blur-md ${
                              isActive
                                ? "border-emerald-400/50 bg-emerald-400/5"
                                : "border-white/10 bg-white/[.04] hover:bg-white/[.06]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-white">{room.name}</h3>
                                <p className="text-sm text-slate-200/90">
                                  {room.type} · {room.capacity} ที่นั่ง
                                </p>
                                {floor && (
                                  <p className="text-xs text-slate-300/80">
                                    ชั้น {floor} · {FLOOR_LABEL[floor] || `ชั้น ${floor}`}
                                  </p>
                                )}
                              </div>
                              <Status busy={busy} />
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectRoom(room)}
                                className={`flex-1 rounded-xl px-4 py-2 text-sm border transition ${
                                  isActive
                                    ? "border-emerald-400 bg-emerald-400/10"
                                    : "border-white/20 bg-white/10 hover:bg-white/15"
                                }`}
                              >
                                {isActive ? "เลือกแล้ว" : "เลือกห้องนี้"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <StepActions>
                <div />
                <NextButton onClick={nextStep} disabled={!canNextFromStep1} />
              </StepActions>
            </Section>
          )}

          {/* STEP 2 */}
          {step === 2 && isTimeFirst && (
            <Section title="ขั้นที่ 2 · เลือกชั้น (สาขา)">
              <Card>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {FLOORS.map((f) => (
                    <button
                      key={f}
                      disabled={!canPickFloor}
                      onClick={() => {
                        setFloor(String(f));
                        setSelected(null);
                      }}
                      className={`rounded-2xl px-3 py-3 text-left border transition ${
                        floor === String(f)
                          ? "border-emerald-400/40 bg-emerald-400/10"
                          : "border-white/10 bg-zinc-900/80 hover:bg-zinc-800/80"
                      } ${!canPickFloor ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="text-xs text-slate-300/80">ชั้น {f}</div>
                      <div className="font-medium text-white">{FLOOR_LABEL[f]}</div>
                    </button>
                  ))}
                </div>
              </Card>
              <StepActions>
                <BackButton onClick={backStep} />
                <NextButton onClick={nextStep} disabled={!canNextFromStep2} />
              </StepActions>
            </Section>
          )}

          {step === 2 && !isTimeFirst && (
            <Section title="ขั้นที่ 2 · เลือกวันและช่วงเวลา">
              <p className="text-xs text-slate-400 mb-2">
                เลือกวันที่และช่วงเวลาที่ต้องการจองสำหรับห้อง {selected?.name || "-"}
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Card
  className={`md:col-span-1 transition-all ${
    needDateHint && !date
      ? "ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
      : ""
  }`}
>


                  <FancyDate
                    value={date}
                    min={today}
                    onChange={(iso) => {
                      setDate(iso);
                      setSlotStart(null);
                      setSlotEnd(null);
                      resetLower();
                    }}
                  />
                </Card>
                <Card className="md:col-span-2">
                  <Label>Time</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TIME_POINTS.map((point, i) => {
                      const isLastPoint = i >= TIME_POINTS.length - 1;
                      const isBusySlot = !isLastPoint && !!busySlotByIndex[i];
                      const isEndOnlyPoint = isLastPoint && slotStart === null;
                      const isSel =
                        (slotStart === i && slotEnd === null) ||
                        (startIdx !== null && endIdx !== null && i >= startIdx && i <= endIdx);
                      return (
                        <button
                          key={point.value}
                          disabled={isBusySlot || isEndOnlyPoint}
                          onClick={() => onClickSlot(i)}
                          className={`rounded-xl px-3 py-2 text-sm border transition shadow-sm ${
  isBusySlot
    ? "border-rose-400/60 bg-rose-500/25 text-rose-100 cursor-not-allowed"
    : isEndOnlyPoint
    ? "border-white/20 bg-zinc-800/60 text-slate-300 cursor-not-allowed"
    : (!date && needDateHint)
    ? "border-red-400 bg-red-500/20 animate-pulse"
    : isSel
    ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_12px_rgba(16,185,129,.25)]"
    : "border-white/10 bg-zinc-900/80 hover:bg-zinc-800/80"
}`}

                        >
                          {point.display}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-slate-300/80">
                    {timeRangeLabel ? (
                      <>
                        ช่วงที่เลือก: <b className="text-slate-100">{timeRangeLabel}</b>
                      </>
                    ) : (
                      "Click one block for start time, then click one block for end time"
                    )}
                    {timeRangeLabel && (
                      <button
                        onClick={() => {
                          setSlotStart(null);
                          setSlotEnd(null);
                          resetLower();
                        }}
                        className="ml-2 underline"
                      >
                        ล้างช่วงเวลา
                      </button>
                    )}
                  </div>
                </Card>
              </div>

              <StepActions>
                <BackButton onClick={backStep} />
                <NextButton onClick={nextStep} disabled={!canNextFromStep2} />
              </StepActions>
            </Section>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <Section
              title={
                isTimeFirst
                  ? "ขั้นที่ 3 · เลือกห้อง + Add-ons"
                  : "ขั้นที่ 3 · Add-ons & ยืนยันการจอง"
              }
            >
              {isTimeFirst && (
                <>
                  {/* Quick filter */}
                  <div className="mb-2 flex flex-wrap gap-2">
                    {["ทั้งหมด", ...TYPES].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          typeFilter === t
                            ? "border-emerald-400/40 bg-emerald-400/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="mb-2 grid gap-2 md:grid-cols-2">
                    <input
                      value={roomKeyword}
                      onChange={(e) => setRoomKeyword(e.target.value)}
                      placeholder="Keyword (name, description, floor, type, location)"
                      className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                    />
                    <input
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      placeholder="Location"
                      className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="mb-2 grid gap-2 md:grid-cols-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                    >
                      <option value="name">Sort by name</option>
                      <option value="capacity">Sort by capacity</option>
                      <option value="floor">Sort by floor</option>
                      <option value="type">Sort by type</option>
                      <option value="location">Sort by location</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm"
                    >
                      <option value="asc">ASC</option>
                      <option value="desc">DESC</option>
                    </select>
                  </div>

                  {/* Filters */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <Label>ความจุขั้นต่ำ (ที่นั่ง)</Label>
                      <select
                        value={minCap}
                        onChange={(e) => setMinCap(Number(e.target.value))}
                        className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2.5 text-slate-200"
                      >
                        {[0, 10, 20, 30, 40, 50, 60].map((v) => (
                          <option key={v} value={v}>
                            {v === 0 ? "ไม่กำหนด" : `${v}+`}
                          </option>
                        ))}
                      </select>
                    </Card>
                    <Card className="md:col-span-2">
                      <Label>ประเภทห้อง (ดรอปดาวน์)</Label>
                      <div className="relative w-full max-w-xs">
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2.5 text-slate-200"
                        >
                          {["ทั้งหมด", ...TYPES].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  </div>

                  {/* Rooms */}
                  {!canShowRooms ? (
                    <Card>
                      <div className="text-sm text-slate-300/80">
                        เลือก <b>วัน–ช่วงเวลา</b> และ <b>ชั้น</b> ก่อน
                      </div>
                    </Card>
                  ) : roomsLoading ? (
                    <Card>
                      <div className="text-sm text-slate-300/80">กำลังโหลดข้อมูลห้องจาก backend...</div>
                    </Card>
                  ) : (
                    <>
                      {roomsError && (
                        <Card className="mb-3 border-amber-300/30 bg-amber-500/10">
                          <div className="text-sm text-amber-100">
                            โหลดข้อมูลห้องจาก backend ไม่สำเร็จ: {roomsError}
                          </div>
                          <div className="text-xs text-amber-200/80 mt-1">ระบบกำลังใช้ข้อมูลสำรองชั่วคราว</div>
                        </Card>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {roomsFiltered.map((room) => {
                          const busy = availabilityByRoom[room.id]?.busy;
                          const isActive = selected?.id === room.id;
                          return (
                            <article
                              key={room.id}
                              className={`rounded-2xl border p-4 transition backdrop-blur-md ${
                                isActive
                                  ? "border-emerald-400/50 bg-emerald-400/5"
                                  : "border-white/10 bg-white/[.04] hover:bg-white/[.06]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold text-white">{room.name}</h3>
                                  <p className="text-sm text-slate-200/90">
                                    {room.type} · {room.capacity} ที่นั่ง
                                  </p>
                                  {date && hasTimeRange && (
                                    <p className="text-xs text-slate-300/80">
                                      {formatDate(date)} · {timeRangeLabel} · ชั้น {floor} ·{" "}
                                      {FLOOR_LABEL[floor] || `ชั้น ${floor}`}
                                    </p>
                                  )}
                                </div>
                                <Status busy={busy} />
                              </div>
                              <div className="mt-4 flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleSelectRoom(room)}
                                  className={`flex-1 rounded-xl px-4 py-2 text-sm border transition ${
                                    busy
                                      ? "border-white/10 bg-zinc-900/70 text-slate-500 cursor-not-allowed"
                                      : isActive
                                      ? "border-emerald-400 bg-emerald-400/10"
                                      : "border-white/20 bg-white/10 hover:bg-white/15"
                                  }`}
                                >
                                  {busy ? "ไม่ว่าง" : isActive ? "เลือกแล้ว" : "เลือกห้องนี้"}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Add-ons */}
              <Card className="mt-4">
                <Label>ออปชันเสริม (Add-ons)</Label>
                {!selected ? (
                  <div className="text-sm text-slate-400">
                    {isTimeFirst
                      ? "เลือกห้องก่อนเพื่อดู Add-ons ที่เหมาะสม"
                      : "คุณเลือกห้องแล้ว เลือก Add-ons เพิ่มได้เลย"}
                  </div>
                ) : addonsLoading ? (
                  <div className="text-sm text-slate-400">Loading add-ons...</div>
                ) : addonsError ? (
                  <div className="text-sm text-rose-300">{addonsError}</div>
                ) : (
                  <AddonSelector items={addonOptions} values={addons} onChange={setAddons} />
                )}
              </Card>

              {/* Preview */}
              {selected && (
                <div className="mt-6 border border-white/10 bg-white/[.03] rounded-2xl p-4">
                  <h4 className="font-medium text-white mb-2">สรุปการจอง</h4>
                  <p className="text-sm text-slate-300 mb-1">
                    ห้อง: {selected.name} ({selected.type})
                  </p>
                  <p className="text-sm text-slate-300 mb-1">
                    ชั้น {floor} - {FLOOR_LABEL[floor]}
                  </p>
                  <p className="text-sm text-slate-300 mb-1">
                    วันที่ {formatDate(date) || "-"} เวลา {timeRangeLabel || "-"}
                  </p>
                  <p className="text-sm text-slate-300">
                    Add-ons:{" "}
                    {Object.keys(addons).length
                      ? normalizeAddonsForPayload(addons)
                          .map((a) => `${a.qty}× ${a.addOnId}`)
                          .join(", ")
                      : "ไม่มี"}
                  </p>
                  {availabilityLoading && (
                    <p className="text-xs text-slate-400 mt-2">Checking live availability...</p>
                  )}
                  {isStudent && (
                    <p className={`text-xs mt-2 ${exceedsStudentDailyLimit ? "text-amber-300" : "text-slate-400"}`}>
                      Approved hours today: {approvedHoursToday}h. Selected: {selectedHours}h.
                      {exceedsStudentDailyLimit
                        ? " Total exceeds 2h/day. This reservation will require admin approval."
                        : " Within 2h/day, it can be auto approved."}
                    </p>
                  )}
                  {reservationError && <p className="text-xs mt-2 text-rose-300">{reservationError}</p>}
                </div>
              )}

              <StepActions>
                <BackButton onClick={backStep} />
                <button
                  disabled={!selected || !hasDate || !hasTimeRange || reservationSubmitting}
                  onClick={confirmBooking}
                  className={`px-6 py-2 rounded-xl text-black font-medium transition ${
                    selected && hasDate && hasTimeRange
                      ? "bg-emerald-400 hover:bg-emerald-300"
                      : "bg-zinc-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {reservationSubmitting
                    ? "Submitting..."
                    : isStudent && exceedsStudentDailyLimit
                    ? "Request approval"
                    : "Reserve"}
                </button>
              </StepActions>
            </Section>
          )}
        </div>
      </div>

      {/* STEP 4 — Success overlay */}
      {step === 4 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center animate-[appear_400ms_ease-out]">
            <div className="mx-auto w-40 h-40 rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/40 shadow-[0_0_60px_rgba(16,185,129,0.45)] grid place-items-center">
              <div className="w-24 h-24 rounded-full bg-emerald-400 grid place-items-center shadow-[0_10px_40px_rgba(16,185,129,0.7)]">
                <svg viewBox="0 0 24 24" className="w-14 h-14 text-black">
                  <path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-emerald-400 drop-shadow">
              {createdReservationStatus === "pending" ? "Request Submitted" : "Reservation Success"}
            </h2>
            <p className="mt-1 text-slate-300">{createdReservationMessage || "Booking saved."}</p>
            <p className="mt-2 text-xs text-slate-400">
              Status: <span className="font-semibold">{createdReservationStatus || "approved"}</span>
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90"
              >
                ไปแดชบอร์ด
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10"
              >
                กลับหน้าแรก
              </button>
              <button
                onClick={() => {
                  // เริ่มจองใหม่: รีเซ็ตสเต็ป + ค่าที่เลือก (โหมดปัจจุบันยังอยู่)
                  resetAll();
                  setStep(1);
                }}
                className="px-4 py-2 rounded-xl border border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
              >
                จองใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* keyframes (Tailwind arbitrary, no config needed) */}
      <style>{`
        @keyframes appear {
          from { opacity: 0; transform: translateY(6px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ---------- UI bits ---------- */
function Stepper({ step, total, labels = [] }) {
  const cols = total * 2 - 1; // circle,line,circle,... (คอลัมน์)

  return (
    <div className="w-full max-w-4xl mx-auto px-2">
      <div
        className="grid items-center gap-x-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {/* วงกลมแต่ละสเต็ป (อยู่คอลัมน์เลขคี่) */}
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const active = n <= step;
          const col = i * 2 + 1;
          return (
            <div key={`c${n}`} className="flex justify-center" style={{ gridColumn: col }}>
              <div
                className={`w-10 h-10 rounded-full grid place-items-center text-sm font-bold transition-all
                  ${
                    active
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_14px_rgba(16,185,129,.45)] scale-110"
                      : "bg-zinc-700 text-slate-300"
                  }`}
              >
                {n}
              </div>
            </div>
          );
        })}

        {/* เส้นเชื่อม + ป้ายชื่อ (อยู่คอลัมน์เลขคู่) */}
        {Array.from({ length: total - 1 }).map((_, i) => {
          const active = i + 1 < step; // เส้นก่อนสเต็ปล่าสุดเป็น active
          const col = i * 2 + 2;
          return (
            <div key={`s${i}`} className="relative" style={{ gridColumn: col }}>
              <div
                className={`h-[3px] rounded-full ${
                  active ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : "bg-zinc-700"
                }`}
              />
              {labels[i] && (
                <div
                  className={`absolute -top-6 left-1/2 -translate-x-1/2 text-center whitespace-nowrap
                    text-[11px] md:text-sm font-medium
                    ${active ? "text-emerald-300" : "text-slate-400"}`}
                >
                  {labels[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm text-slate-300">{title}</h2>
      {children}
    </section>
  );
}
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:p-5 ${className}`}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <div className="text-xs text-slate-400 mb-2">{children}</div>;
}

function Status({ busy }) {
  const base =
    "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border transition-all whitespace-nowrap";

  if (busy === undefined) {
    return (
      <span className={`${base} border-slate-500/40 text-slate-200 bg-slate-500/10`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        ยังไม่ตรวจสอบเวลา
      </span>
    );
  }

  if (busy) {
    return (
      <span className={`${base} border-red-400/30 text-red-200 bg-red-500/10`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        ไม่ว่าง
      </span>
    );
  }
  return (
    <span className={`${base} border-emerald-400/30 text-emerald-200 bg-emerald-500/10`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      ว่าง
    </span>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition"
    >
      ← ย้อนกลับ
    </button>
  );
}
function NextButton({ onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-black font-medium transition ${
        disabled ? "bg-zinc-700 text-slate-400 cursor-not-allowed" : "bg-emerald-400 hover:bg-emerald-300"
      }`}
    >
      ถัดไป →
    </button>
  );
}
function StepActions({ children }) {
  return <div className="flex items-center justify-between mt-4">{children}</div>;
}

/* ---------- Addon Selector ---------- */
function AddonSelector({ items = [], values, onChange }) {
  function setQty(id, next) {
    const def = items.find((a) => a.addOnId === id);
    if (!def) return;
    const v = Math.max(0, Math.min(def.max, Number(next) || 0));
    onChange({ ...values, [id]: v });
  }
  function inc(id) {
    setQty(id, (values[id] || 0) + 1);
  }
  function dec(id) {
    setQty(id, (values[id] || 0) - 1);
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => {
        const v = values[a.addOnId] || 0;
        return (
          <div
            key={a.addOnId}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2"
          >
            <div>
              <div className="text-sm text-white">{a.label}</div>
              <div className="text-xs text-slate-400">
                สูงสุด {a.max} {a.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => dec(a.addOnId)}
                className="w-8 h-8 grid place-items-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20"
              >
                −
              </button>
              <input
                value={v}
                onChange={(e) => setQty(a.addOnId, e.target.value)}
                className="w-14 text-center rounded-lg bg-zinc-900 border border-white/10 py-1"
              />
              <button
                type="button"
                onClick={() => inc(a.addOnId)}
                className="w-8 h-8 grid place-items-center rounded-lg border border-white/10 bg-white/10 hover:bg-white/20"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div className="text-sm text-slate-400">ไม่มีรายการเสริมสำหรับประเภทห้องนี้</div>}
    </div>
  );
}

/* ---------- Fancy Date ---------- */
function FancyDate({ value, onChange, min }) {
  const todayISO = new Date().toISOString().slice(0, 10);
  return (
    <div className="group relative">
      <div className="relative rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
        <label className="text-xs text-slate-400">เลือกวัน</label>
        <div className="mt-4 flex justify-between">
          {["จ", "อ", "พ", "พฤ", "ศ"].map((day, i) => {
            const now = new Date();
            const target = new Date();
            const offset = (i + 1 + 7 - now.getDay()) % 7;
            target.setDate(now.getDate() + offset);
            const iso = target.toISOString().slice(0, 10);
            const isActive = value === iso;
            return (
              <button
                type="button"
                key={day}
                onClick={() => onChange(iso)}
                className={`w-12 h-12 rounded-full border text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-lg"
                    : "bg-zinc-800 border-white/10 text-slate-300 hover:bg-zinc-700"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <div className="mt-3 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
              <rect x="3" y="5" width="18" height="16" rx="3" ry="3" stroke="currentColor" />
              <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
            </svg>
          </span>
          <input
            type="date"
            min={min || todayISO}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-xl bg-zinc-950/70 border border-white/10 pl-10 pr-3 py-2.5 text-slate-200 focus:ring-2 focus:ring-emerald-400/40"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function buildHourlySlots(startTime, endTime) {
  const slots = [];
  const start = toMinute(startTime);
  const end = toMinute(endTime);
  for (let t = start; t + 60 <= end; t += 60) {
    const startLabel = minuteToLabel(t);
    const endLabel = minuteToLabel(t + 60);
    const startDisplay = toDotTime(startLabel);
    const endDisplay = toDotTime(endLabel);
    slots.push({
      start: startLabel,
      end: endLabel,
      startLabel,
      endLabel,
      startDisplay,
      endDisplay,
      label: `${startDisplay} - ${endDisplay}`,
    });
  }
  return slots;
}

function buildTimePoints(startTime, endTime) {
  const points = [];
  const start = toMinute(startTime);
  const end = toMinute(endTime);
  for (let t = start; t <= end; t += 60) {
    const label = minuteToLabel(t);
    points.push({ value: label, display: toDotTime(label) });
  }
  return points;
}

function toDotTime(hhmm) {
  return hhmm.replace(":", ".");
}

function toMinute(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minuteToLabel(totalMinute) {
  const h = Math.floor(totalMinute / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinute % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getPointISO(dateISO, idx) {
  return new Date(`${dateISO}T${TIME_POINTS[idx].value}:00`).toISOString();
}

function hasOverlap(startA, endA, startB, endB) {
  const a1 = new Date(startA).getTime();
  const a2 = new Date(endA).getTime();
  const b1 = new Date(startB).getTime();
  const b2 = new Date(endB).getTime();
  return a1 < b2 && b1 < a2;
}

function deriveBusySlotByIndex(blocks, dateISO) {
  const map = {};
  SLOTS.forEach((_, idx) => {
    const slotStart = getPointISO(dateISO, idx);
    const slotEnd = getPointISO(dateISO, idx + 1);
    const busy = blocks.some((block) => {
      if (block.isFree) return false;
      return hasOverlap(slotStart, slotEnd, block.start, block.end);
    });
    if (busy) map[idx] = true;
  });
  return map;
}

function hasBusyInRange(startIndex, endIndex, busyMap) {
  if (startIndex === null || endIndex === null) return false;
  for (let i = startIndex; i <= endIndex; i++) {
    if (busyMap?.[i]) return true;
  }
  return false;
}

function getReservationRoomId(room) {
  if (!room) return "";
  if (isMongoObjectId(room.reservationRoomId)) return room.reservationRoomId;
  if (isMongoObjectId(room.id)) return room.id;
  return "";
}

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}
function normalizeAddonsForPayload(values) {
  return Object.entries(values)
    .filter(([, qty]) => qty > 0)
    .map(([addOnId, qty]) => ({ addOnId, qty: Number(qty) }));
}

function mapReservationError(err) {
  const message = String(err?.message || "");
  if (/401|unauthorized/i.test(message)) return "Unauthorized. Please login again.";
  if (/already booked|time slot already booked|overlap/i.test(message)) return "This slot is already reserved.";
  if (/must be on|:30|time blocks/i.test(message)) return "Start/end must be on :30 time blocks.";
  if (/07:30|20:30|available only between/i.test(message)) {
    return "Room available only between 07:30 and 20:30.";
  }
  return message || "Cannot create reservation right now.";
}
