
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Usuario from '../src/models/Usuario.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const admins = await Usuario.find({ rol: 'superadmin' });
        if (admins.length === 0) {
            console.log('No superadmin found.');
            const allUsers = await Usuario.find().limit(5);
            console.log('Sample of other users:', allUsers.map(u => ({ _id: u._id, email: u.email, rol: u.rol })));
        } else {
            console.log('Superadmins found:', admins.map(a => ({ _id: a._id, email: a.email, active: a.activo })));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkAdmin();
