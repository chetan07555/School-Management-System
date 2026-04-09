/**
 * Migration script to populate missing 'subject' field in existing attendance records
 * This script assigns a placeholder subject to old records that don't have one
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

async function migrate() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Find all records without a subject (where subject is null, undefined, or empty string)
    const recordsWithoutSubject = await Attendance.find({ 
      $or: [
        { subject: null },
        { subject: undefined },
        { subject: '' }
      ]
    });

    console.log(`Found ${recordsWithoutSubject.length} records without subject`);

    if (recordsWithoutSubject.length === 0) {
      console.log('No records to migrate');
      await mongoose.connection.close();
      return;
    }

    // Update all records without subject to have a placeholder subject
    const result = await Attendance.updateMany(
      { 
        $or: [
          { subject: null },
          { subject: undefined },
          { subject: '' }
        ]
      },
      { $set: { subject: 'General' } }
    );

    console.log(`\nMigration complete:
    - Updated: ${result.modifiedCount}
    - Total: ${recordsWithoutSubject.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

migrate();
