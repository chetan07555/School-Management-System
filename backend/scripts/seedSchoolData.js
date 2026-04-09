require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const ClassRoom = require("../models/ClassRoom");

const SUBJECTS = ["Maths", "Science", "English", "Social", "Computer", "Hindi"];
const PASSWORD = "12345";

const buildClassNames = () => Array.from({ length: 10 }, (_, i) => `CLASS ${i + 1}`);

const buildStudentPayload = async () => {
  const classes = buildClassNames();
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const students = [];

  let index = 1;
  for (const className of classes) {
    for (let count = 1; count <= 10; count += 1) {
      students.push({
        name: `Student${index}`,
        email: `student${index}@gmail.com`,
        password: hashed,
        role: "student",
        class: className
      });
      index += 1;
    }
  }

  return students;
};

const buildTeacherPayload = async () => {
  const classes = buildClassNames();
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const teachers = [];
  const assignments = [];

  let index = 1;
  for (const className of classes) {
    for (const subject of SUBJECTS) {
      const teacher = {
        name: `Teacher${index}`,
        email: `teacher${index}@gmail.com`,
        password: hashed,
        role: "teacher",
        class: className
      };

      teachers.push(teacher);
      assignments.push({
        teacherEmail: teacher.email,
        className,
        subject
      });

      index += 1;
    }
  }

  return { teachers, assignments };
};

const upsertUsers = async (users) => {
  for (const user of users) {
    await User.updateOne(
      { email: user.email },
      {
        $set: {
          name: user.name,
          password: user.password,
          role: user.role,
          class: user.class
        }
      },
      { upsert: true }
    );
  }
};

const upsertClassrooms = async (assignments) => {
  const classes = buildClassNames();
  const teacherEmails = assignments.map((a) => a.teacherEmail);
  const teachers = await User.find({ email: { $in: teacherEmails }, role: "teacher" }).select("_id email");
  const teacherIdByEmail = new Map(teachers.map((t) => [t.email, t._id]));

  // Keep seed deterministic: one teacher per class+subject for Class 1-10.
  await ClassRoom.deleteMany({
    className: { $in: classes },
    subject: { $in: SUBJECTS }
  });

  for (const item of assignments) {
    const teacherId = teacherIdByEmail.get(item.teacherEmail);
    if (!teacherId) {
      throw new Error(`Teacher not found for assignment: ${item.teacherEmail}`);
    }

    await ClassRoom.create({
      className: item.className,
      subject: item.subject,
      teacherId
    });
  }
};

const buildJsonSummary = async () => {
  const classes = buildClassNames();
  const students = await User.find({ role: "student", email: /^student\d+@gmail\.com$/i })
    .select("_id name email role class")
    .sort({ email: 1 })
    .lean();
  const teachers = await User.find({ role: "teacher", email: /^teacher\d+@gmail\.com$/i })
    .select("_id name email role class")
    .sort({ email: 1 })
    .lean();
  const classrooms = await ClassRoom.find({
    className: { $in: classes },
    subject: { $in: SUBJECTS }
  })
    .select("_id className subject teacherId")
    .sort({ className: 1, subject: 1 })
    .lean();

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      classesCount: classes.length,
      studentsCount: students.length,
      teachersCount: teachers.length,
      subjectAssignmentsCount: classrooms.length
    },
    classes: classes.map((name, idx) => ({
      id: `class-${idx + 1}`,
      name
    })),
    users: {
      students,
      teachers
    },
    subjectAssignments: classrooms.map((item) => ({
      id: item._id,
      className: item.className,
      subject: item.subject,
      teacherId: item.teacherId
    }))
  };
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required in environment variables.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const students = await buildStudentPayload();
  const { teachers, assignments } = await buildTeacherPayload();

  await upsertUsers(students);
  await upsertUsers(teachers);
  await upsertClassrooms(assignments);

  const summary = await buildJsonSummary();
  console.log(JSON.stringify(summary, null, 2));
};

seed()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seeding failed:", error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  });
