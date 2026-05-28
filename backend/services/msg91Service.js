import axios from 'axios';

const MSG91_SEND_OTP_URL = 'https://control.msg91.com/api/v5/otp';
const MSG91_VERIFY_OTP_URL = 'https://control.msg91.com/api/v5/otp/verify';

const getMsg91Config = () => {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
        throw new Error('MSG91 credentials are not configured in environment variables');
    }

    return { authKey, templateId };
};

const buildMobileWithCountryCode = (phone) => `91${phone}`;

export const sendOtpViaMsg91 = async (phone) => {
    const { authKey, templateId } = getMsg91Config();
    const mobile = buildMobileWithCountryCode(phone);

    const response = await axios.post(
        MSG91_SEND_OTP_URL,
        {
            mobile,
            template_id: templateId,
        },
        {
            headers: {
                authkey: authKey,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        }
    );

    return response.data;
};

export const verifyOtpViaMsg91 = async (phone, otp) => {
    const { authKey } = getMsg91Config();
    const mobile = buildMobileWithCountryCode(phone);

    const response = await axios.get(MSG91_VERIFY_OTP_URL, {
        params: { mobile, otp },
        headers: { authkey: authKey },
        timeout: 10000,
    });

    return response.data;
};
