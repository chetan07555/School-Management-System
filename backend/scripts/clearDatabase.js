/**
 * Script to clear all data from the database
 * This will delete all documents from all collections
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const ClassRoom = require('../models/ClassRoom');
const Marks = require('../models/Marks');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Timetable = require('../models/Timetable');

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Delete all documents from each collection
    const collections = [
      { name: 'User', model: User },
      { name: 'Attendance', model: Attendance },
      { name: 'ClassRoom', model: ClassRoom },
      { name: 'Marks', model: Marks },
      { name: 'Note', model: Note },
      { name: 'Notification', model: Notification },
      { name: 'Timetable', model: Timetable }
    ];

    for (const collection of collections) {
      const result = await collection.model.deleteMany({});
      console.log(`✓ Cleared ${collection.name}: ${result.deletedCount} documents deleted`);
    }

    console.log('\n✅ Database cleared successfully!');

  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

clearDatabase();
