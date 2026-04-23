import React, { useEffect, useState } from "react";
import API from "../../api";

function NoticesTab() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "all",
  });
  const [editingId, setEditingId] = useState(null);

  const fetchNotices = async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const saveNotice = async () => {
    if (!form.title || !form.content) {
      alert("제목과 내용을 입력하세요.");
      return;
    }

    if (editingId) {
      await API.put(`/notices/${editingId}`, form);
    } else {
      await API.post("/notices", form);
    }

    setEditingId(null);
    setForm({
      title: "",
      content: "",
      target: "all",
    });
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

  const deleteNotice = async (id) => {
    if (!window.confirm("공지를 삭제할까요?")) return;
    await API.delete(`/notices/${id}`);
    fetchNotices();
  };

  return (
    <>
      <h3>📢 공지사항</h3>

      <div className="card">
        <h4>{editingId ? "공지 수정" : "공지 작성"}</h4>
        <input
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="admin-textarea"
          placeholder="내용"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <select
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
        >
          <option value="all">전체</option>
          <option value="store">가게</option>
          <option value="driver">기사</option>
        </select>
        <button className="primary full-width-btn" onClick={saveNotice}>
          {editingId ? "공지 수정" : "공지 등록"}
        </button>
      </div>

      {notices.map((notice) => (
        <div key={notice._id} className="card">
          <p><b>{notice.title}</b></p>
          <p>대상: {notice.target}</p>
          <p>{notice.content}</p>
          <p>읽음 수: {notice.read_by?.length || 0}</p>
          <button onClick={() => startEdit(notice)}>수정</button>
          <button className="danger" onClick={() => deleteNotice(notice._id)}>
            삭제
          </button>
        </div>
      ))}
    </>
  );
}

export default NoticesTab;
