import React, { useEffect, useState } from "react";
import API from "../../api";

function NoticesTab() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "all",
  });

  const fetchNotices = async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const createNotice = async () => {
    if (!form.title || !form.content) {
      alert("공지 제목과 내용을 입력하세요.");
      return;
    }

    await API.post("/notices", form);
    setForm({
      title: "",
      content: "",
      target: "all",
    });
    fetchNotices();
  };

  return (
    <>
      <h3>📢 공지사항</h3>

      <div className="card">
        <h4>공지 작성</h4>
        <input
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="admin-textarea"
          placeholder="공지 내용"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <select
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
        >
          <option value="all">전체</option>
          <option value="store">가게만</option>
          <option value="driver">기사만</option>
        </select>
        <button className="primary full-width-btn" onClick={createNotice}>
          공지 저장
        </button>
      </div>

      <h4>공지 목록</h4>
      {notices.map((notice) => (
        <div key={notice._id} className="card">
          <b>{notice.title}</b>
          <p>대상: {notice.target}</p>
          <p>{notice.content}</p>
          <p>작성자: {notice.created_by}</p>
        </div>
      ))}
    </>
  );
}

export default NoticesTab;
