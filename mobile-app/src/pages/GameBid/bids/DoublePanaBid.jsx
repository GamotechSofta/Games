import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import EasyModeBid from './EasyModeBid';
import { DOUBLE_PANAS } from '../panaRules';

const validatePana = (n) => {
    if (!n) return false;
    const str = n.toString().trim();
    if (!/^[0-9]{3}$/.test(str)) return false;
    const digits = str.split('').map(Number);
    const [first, second, third] = digits;
    const hasConsecutiveSame = (first === second) || (second === third);
    if (!hasConsecutiveSame) return false;
    if (first === 0) return false;
    if (second === 0 && third === 0) return true;
    if (first === second && third === 0) return true;
    if (third <= first) return false;
    return true;
};

const DoublePanaBid = (props) => {
    const { t } = useTranslation();
    return (
        <EasyModeBid
            {...props}
            label={t('gameBid.enterPana')}
            maxLength={3}
            validateInput={validatePana}
            showBidsList
            openReviewOnAdd={false}
            showInlineSubmit
            showModeTabs
            specialModeType="doublePana"
            validDoublePanas={DOUBLE_PANAS}
        />
    );
};

export default DoublePanaBid;
