import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { noticeService } from "../../services/noticeService";
import { usePolling } from "../../hooks/usePolling";

function NoticesTab() {
  const [notices, setNotices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "all",
  });

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchNotices, 6000);

  const save = async () => {
    if (!form.title || !form.content) {
      alert("제목과 내용을 입력하세요.");
      return;
    }
    if (editingId) {
      await noticeService.updateNotice(editingId, form);
    } else {
      await noticeService.createNotice(form);
    }
    setEditingId(null);
    setForm({ title: "", content: "", target: "all" });
    fetchNotices();
  };

  const startEdit = (notice) => {
    setEditingId(notice._id);
    setForm({
      title: notice.title,
      content: notice.content,
      target: notice.target,
    });
  };

  const remove = async (id) => {
    if (!window.confirm("공지를 삭제할까요?")) return;
    await noticeService.deleteNotice(id);
    fetchNotices();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>{editingId ? "공지 수정" : "공지 작성"}</h3>
            <p>가게와 기사에게 자연스럽게 전달되는 메시지 시스템</p>
          </div>
        </div>
        <div className="auth-form" style={{ marginTop: 16 }}>
          <Input label="제목" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <Input label="내용" as="textarea" rows={5} value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
          <Input label="대상" as="select" value={form.target} onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}>
            <option value="all">전체</option>
            <option value="store">가게</option>
            <option value="driver">기사</option>
          </Input>
          <Button onClick={save}>{editingId ? "공지 수정" : "공지 저장"}</Button>
        </div>
      </Card>

      {notices.map((notice) => (
        <Card key={notice._id}>
          <div className="section-heading">
            <div>
              <h3>{notice.title}</h3>
              <p>{notice.content}</p>
            </div>
            <div className="status-row">
              <Badge tone="primary">{notice.target}</Badge>
              <Badge tone="secondary">읽음 {notice.read_by?.length || 0}</Badge>
            </div>
          </div>
          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={() => startEdit(notice)}>
              수정
            </Button>
            <Button variant="danger" onClick={() => remove(notice._id)}>
              삭제
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default NoticesTab;
