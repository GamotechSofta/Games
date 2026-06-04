import PhoneLink from '../layout/PhoneLink';

export const PlayerIndexCell = ({ index }) => (
    <td className="px-3 py-3 text-gray-500">{index}</td>
);

export const PlayerNameCell = ({ username }) => (
    <td className="px-3 py-3 font-medium text-gray-900">{username || '—'}</td>
);

export const PlayerPhoneCell = ({ phone }) => (
    <td className="px-3 py-3">
        <PhoneLink phone={phone} />
    </td>
);
