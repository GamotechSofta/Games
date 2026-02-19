import express from 'express';
import { 
    adminLogin, 
    createAdmin, 
    createBookie,
    getAllBookies,
    getAllSuperAdmins,
    getBookieById,
    updateBookie,
    deleteBookie,
    toggleBookieStatus,
    getSecretDeclarePasswordStatus,
    setSecretDeclarePassword,
    verifySecretDeclarePassword,
    getAdminUpi,
    setAdminUpi,
    createSpecificAdmin,
    getAllSpecificAdmins,
    updateSpecificAdmin,
    deleteSpecificAdmin,
} from '../../controllers/adminController.js';
import { getLogs, deleteLogs } from '../../controllers/activityLogController.js';
import { verifyAdmin, verifySuperAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.post('/login', adminLogin);
router.post('/create', createAdmin); // For initial admin setup

// UPI ID (Super Admin)
router.get('/me/upi', verifySuperAdmin, getAdminUpi);
router.patch('/me/upi', verifySuperAdmin, setAdminUpi);

// Secret declare password: status/verify for any admin (super_admin + specific_admin); set own only for super_admin
router.get('/me/secret-declare-password-status', verifyAdmin, getSecretDeclarePasswordStatus);
router.patch('/me/secret-declare-password', verifySuperAdmin, setSecretDeclarePassword);
router.post('/verify-secret-declare-password', verifyAdmin, verifySecretDeclarePassword);

// Super Admin management routes (Super Admin only)
router.get('/super-admins', verifyAdmin, getAllSuperAdmins); // Get all super admins
router.get('/logs', verifyAdmin, getLogs); // Get activity logs
router.delete('/logs', verifyAdmin, deleteLogs); // Delete activity logs (super_admin only)

// Specific admin management (Super Admin only): create admins with limited tab access
router.get('/specific-admins', verifyAdmin, getAllSpecificAdmins);
router.post('/specific-admins', verifyAdmin, createSpecificAdmin);
router.put('/specific-admins/:id', verifyAdmin, updateSpecificAdmin);
router.delete('/specific-admins/:id', verifyAdmin, deleteSpecificAdmin);

// Bookie management routes (Super Admin only)
router.post('/bookies', verifyAdmin, createBookie); // Create new bookie
router.get('/bookies', verifyAdmin, getAllBookies); // Get all bookies
router.get('/bookies/:id', verifyAdmin, getBookieById); // Get single bookie
router.put('/bookies/:id', verifyAdmin, updateBookie); // Update bookie
router.delete('/bookies/:id', verifyAdmin, deleteBookie); // Delete bookie
router.patch('/bookies/:id/toggle-status', verifyAdmin, toggleBookieStatus); // Toggle status

// Keep old route for backward compatibility
router.post('/create-bookie', verifyAdmin, createBookie);

export default router;
