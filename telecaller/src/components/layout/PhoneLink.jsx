import { FaPhone } from 'react-icons/fa';

const PhoneLink = ({ phone }) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return <span className="text-gray-400">—</span>;
    return (
        <a
            href={`tel:+91${digits.slice(-10)}`}
            className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-medium"
        >
            <FaPhone className="w-3 h-3" />
            {digits.slice(-10)}
        </a>
    );
};

export default PhoneLink;
