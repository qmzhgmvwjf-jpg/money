import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { usePolling } from "../../hooks/usePolling";

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    emoji: "🎁",
    rewardType: "discount",
    rewardValue: 2000,
    kind: "daily",
    isActive: true,
    isHidden: false,
  });

  const fetchEvents = useCallback(async () => {
    const data = await adminService.getEvents();
    setEvents(data);
  }, []);

  usePolling(fetchEvents, 5000);

  const saveEvent = async () => {
    if (!form.title || !form.description || !form.emoji) return;
    if (editingId) await adminService.updateEvent(editingId, form);
    else await adminService.createEvent(form);
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      emoji: "🎁",
      rewardType: "discount",
      rewardValue: 2000,
      kind: "daily",
      isActive: true,
      isHidden: false,
    });
    fetchEvents();
  };

  const startEdit = (event) => {
    setEditingId(event._id);
    setForm({
      title: event.title,
      description: event.description,
      emoji: event.emoji,
      rewardType: event.reward_type,
      rewardValue: event.reward_value,
      kind: event.kind,
      isActive: event.is_active,
      isHidden: event.is_hidden,
    });
  };

  const toggleFlag = async (event, key) => {
    await adminService.updateEvent(event._id, { [key]: !event[key] });
    fetchEvents();
  };

  const removeEvent = async (id) => {
    await adminService.deleteEvent(id);
    fetchEvents();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>{editingId ? "이벤트 수정" : "이벤트 추가"}</h3>
            <p>럭키박스, 무료 배달, 할인 쿠폰 이벤트를 켜고 끌 수 있습니다.</p>
          </div>
          <Badge tone="primary">{events.filter((item) => item.is_active).length}개 운영중</Badge>
        </div>
        <div className="auth-form" style={{ marginTop: 16 }}>
          <Input label="이모지" value={form.emoji} onChange={(event) => setForm((prev) => ({ ...prev, emoji: event.target.value }))} />
          <Input label="이벤트명" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <Input label="설명" as="textarea" rows={4} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <Input label="보상 타입" as="select" value={form.rewardType} onChange={(event) => setForm((prev) => ({ ...prev, rewardType: event.target.value }))}>
            <option value="discount">할인 쿠폰</option>
            <option value="free_delivery">무료 배달</option>
            <option value="store_fee_free">가게 이용료 무료</option>
            <option value="sticker">스티커 이벤트</option>
          </Input>
          <Input label="보상 값" type="number" value={form.rewardValue} onChange={(event) => setForm((prev) => ({ ...prev, rewardValue: Number(event.target.value) }))} />
          <Input label="유형" as="select" value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}>
            <option value="daily">매일 이벤트</option>
            <option value="surprise">깜짝 이벤트</option>
            <option value="sticker">스티커 이벤트</option>
          </Input>
          <div className="list-actions">
            <Button variant={form.isActive ? "primary" : "secondary"} onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}>
              {form.isActive ? "활성화됨" : "비활성화됨"}
            </Button>
            <Button variant={form.isHidden ? "danger" : "secondary"} onClick={() => setForm((prev) => ({ ...prev, isHidden: !prev.isHidden }))}>
              {form.isHidden ? "숨김" : "노출"}
            </Button>
          </div>
          <Button onClick={saveEvent}>{editingId ? "이벤트 수정" : "이벤트 저장"}</Button>
        </div>
      </Card>

      {events.map((event) => (
        <Card key={event._id}>
          <div className="section-heading">
            <div>
              <h3>{event.emoji} {event.title}</h3>
              <p>{event.description}</p>
            </div>
            <div className="status-row">
              <Badge tone={event.is_active ? "success" : "secondary"}>{event.is_active ? "ON" : "OFF"}</Badge>
              <Badge tone={event.is_hidden ? "danger" : "primary"}>{event.is_hidden ? "숨김" : "노출"}</Badge>
            </div>
          </div>
          <p>{event.reward_label} · {Number(event.reward_value || 0).toLocaleString()} / {event.kind}</p>
          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={() => startEdit(event)}>수정</Button>
            <Button variant="secondary" onClick={() => toggleFlag(event, "is_active")}>
              {event.is_active ? "비활성화" : "활성화"}
            </Button>
            <Button variant="secondary" onClick={() => toggleFlag(event, "is_hidden")}>
              {event.is_hidden ? "노출" : "숨기기"}
            </Button>
            <Button variant="danger" onClick={() => removeEvent(event._id)}>삭제</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default EventsTab;
