const request = require("supertest");

jest.mock("../middleware/authMiddleware", () => {
  return (req, res, next) => {
    const role = req.headers["x-test-role"] || "student";
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      role,
      class: role === "student" ? "10" : ""
    };
    req.userId = req.user._id;
    next();
  };
});

jest.mock("../models/User", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock("../models/Note", () => ({
  create: jest.fn(),
  find: jest.fn()
}));

jest.mock("../models/Attendance", () => ({
  create: jest.fn(),
  find: jest.fn()
}));

jest.mock("../models/Marks", () => ({
  create: jest.fn(),
  find: jest.fn()
}));

jest.mock("../models/ClassRoom", () => ({
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock("../models/Timetable", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  deleteOne: jest.fn()
}));

jest.mock("../models/Notification", () => ({
  create: jest.fn(),
  find: jest.fn(),
  updateMany: jest.fn()
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock("../utils/generateToken", () => jest.fn());

const app = require("../app");
const User = require("../models/User");
const Note = require("../models/Note");
const Attendance = require("../models/Attendance");
const Marks = require("../models/Marks");
const ClassRoom = require("../models/ClassRoom");
const Timetable = require("../models/Timetable");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

describe("Auth API", () => {
  test("POST /api/auth/register should create a user", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-pass");
    User.create.mockResolvedValue({
      _id: "u1",
      name: "Student A",
      email: "student@example.com",
      role: "student",
      class: "10"
    });
    generateToken.mockReturnValue("token-register");

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Student A",
        email: "student@example.com",
        password: "Password123",
        role: "student",
        class: "10"
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe("token-register");
    expect(User.create).toHaveBeenCalled();
  });

  test("POST /api/auth/login should return token", async () => {
    User.findOne.mockResolvedValue({
      _id: "u2",
      name: "Teacher A",
      email: "teacher@example.com",
      role: "teacher",
      class: "",
      password: "hashed-db-pass"
    });
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue("token-login");

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "teacher@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("token-login");
  });
});

describe("Notes API", () => {
  test("POST /api/notes/upload should upload note for teacher", async () => {
    ClassRoom.findOne.mockResolvedValue({ _id: "c1", className: "10", subject: "Math" });
    User.find.mockResolvedValue([{ _id: "s1" }]);
    Notification.create.mockResolvedValue({ _id: "nt1" });
    Note.create.mockResolvedValue({ _id: "n1", title: "Algebra" });

    const res = await request(app)
      .post("/api/notes/upload")
      .set("x-test-role", "teacher")
      .field("title", "Algebra")
      .field("subject", "Math")
      .field("class", "10")
      .attach("file", Buffer.from("file-content"), "algebra.txt");

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("n1");
    expect(Note.create).toHaveBeenCalled();
  });
});

describe("Attendance API", () => {
  test("POST /api/attendance/mark should create attendance for teacher", async () => {
    ClassRoom.findOne.mockResolvedValue({ _id: "c1", className: "10" });
    User.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439012", role: "student", class: "10" });
    User.find.mockResolvedValue([{ _id: "507f1f77bcf86cd799439012" }]);
    Notification.create.mockResolvedValue({ _id: "nt2" });
    Attendance.create.mockResolvedValue({ _id: "a1", status: "Present" });

    const res = await request(app)
      .post("/api/attendance/mark")
      .set("x-test-role", "teacher")
      .send({
        studentId: "507f1f77bcf86cd799439012",
        className: "10",
        date: "2026-04-06",
        status: "Present"
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("a1");
  });

  test("GET /api/attendance should return records and percentage for student", async () => {
    Attendance.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { _id: "a1", className: "10", status: "Present", date: "2026-04-01" },
        { _id: "a2", className: "10", status: "Absent", date: "2026-04-02" }
      ])
    });

    const res = await request(app)
      .get("/api/attendance")
      .set("x-test-role", "student");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.percentage).toBe("50.00");
    expect(Array.isArray(res.body.byClass)).toBe(true);
  });
});

describe("Marks API", () => {
  test("POST /api/marks/add should create marks for teacher", async () => {
    ClassRoom.findOne.mockResolvedValue({ _id: "c1", className: "10", subject: "Science" });
    User.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439012", role: "student", class: "10" });
    User.find.mockResolvedValue([{ _id: "507f1f77bcf86cd799439012" }]);
    Notification.create.mockResolvedValue({ _id: "nt3" });
    Marks.create.mockResolvedValue({ _id: "m1", testName: "Unit Test" });

    const res = await request(app)
      .post("/api/marks/add")
      .set("x-test-role", "teacher")
      .send({
        studentId: "507f1f77bcf86cd799439012",
        className: "10",
        subject: "Science",
        testName: "Unit Test",
        marksObtained: 42,
        totalMarks: 50
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("m1");
  });

  test("GET /api/marks should return student marks", async () => {
    Marks.find.mockResolvedValue([
      { _id: "m1", testName: "UT-1", marksObtained: 45, totalMarks: 50 }
    ]);

    const res = await request(app)
      .get("/api/marks")
      .set("x-test-role", "student");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe("Timetable API", () => {
  test("GET /api/timetable/by-class should return timetable for matching class", async () => {
    Timetable.findOne.mockImplementation((query) => {
      expect(query.class).toBeInstanceOf(RegExp);
      return Promise.resolve({ _id: "t1", class: "10", fileUrl: "uploads/timetable.png" });
    });

    const res = await request(app)
      .get("/api/timetable/by-class")
      .query({ class: "10" })
      .set("x-test-role", "student");

    expect(res.status).toBe(200);
    expect(res.body._id).toBe("t1");
  });
});
