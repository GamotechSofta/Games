import axios from 'axios';

const MSG91_SEND_OTP_URL = 'https://control.msg91.com/api/v5/otp';
const MSG91_VERIFY_OTP_URL = 'https://control.msg91.com/api/v5/otp/verify';

const getMsg91Config = () => {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID;
    const debugEnabled = String(process.env.MSG91_DEBUG || '').toLowerCase() === 'true';
    const useSender = String(process.env.MSG91_USE_SENDER || 'false').toLowerCase() === 'true';

    if (!authKey || !templateId) {
        throw new Error('MSG91 credentials are not fully configured (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)');
    }

    return { authKey, templateId, senderId, debugEnabled, useSender };
};

const buildMobileWithCountryCode = (phone) => `91${phone}`;

export const sendOtpViaMsg91 = async (phone) => {
    const { authKey, templateId, senderId, debugEnabled, useSender } = getMsg91Config();
    const mobile = buildMobileWithCountryCode(phone);
    const payload = {
        mobile,
        template_id: templateId,
    };

    // Sender is optional and controlled by env because some MSG91 OTP routes fail when sender is enforced.
    if (useSender && senderId && String(senderId).trim()) {
        payload.sender = String(senderId).trim();
    }

    if (debugEnabled) {
        console.log('[MSG91][SEND] Request payload:', {
            mobile,
            template_id: templateId,
            sender: payload.sender || '(not provided)',
        });
    }

    const response = await axios.post(
        MSG91_SEND_OTP_URL,
        payload,
        {
            headers: {
                authkey: authKey,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        }
    );

    if (debugEnabled) {
        console.log('[MSG91][SEND] Response:', response.data);
    }

    return response.data;
};

export const verifyOtpViaMsg91 = async (phone, otp) => {
    const { authKey, debugEnabled } = getMsg91Config();
    const mobile = buildMobileWithCountryCode(phone);

    if (debugEnabled) {
        console.log('[MSG91][VERIFY] Request params:', { mobile, otp });
    }

    const response = await axios.get(MSG91_VERIFY_OTP_URL, {
        params: { mobile, otp },
        headers: { authkey: authKey },
        timeout: 10000,
    });

    if (debugEnabled) {
        console.log('[MSG91][VERIFY] Response:', response.data);
    }

    return response.data;
};
