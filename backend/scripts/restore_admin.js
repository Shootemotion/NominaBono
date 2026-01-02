
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Usuario from '../src/models/Usuario.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const restoreAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'brunocleri@gmail.com';
        const password = 'Soporte01'; // Default from bootstrap.js
        const passwordHash = await bcrypt.hash(password, 10);

        let user = await Usuario.findOne({ email });
        if (!user) {
            console.log('Creating superadmin user...');
            user = await Usuario.create({
                email,
                passwordHash,
                rol: 'superadmin',
                permisos: ['*'],
                activo: true,
                status: 'active'
            });
            console.log(`Superadmin created: ${email} / ${password}`);
        } else {
            console.log('Superadmin already exists. Updating password...');
            user.passwordHash = passwordHash;
            user.rol = 'superadmin';
            user.activo = true;
            user.status = 'active';
            await user.save();
            console.log(`Superadmin updated: ${email} / ${password}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

restoreAdmin();
