import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import EasyModeBid from './EasyModeBid';
import { VALID_SINGLE_PANAS } from '../panaRules';

const validateSinglePana = (n) => {
    const s = (n ?? '').toString().trim();
    if (!/^[0-9]{3}$/.test(s)) return false;
    return VALID_SINGLE_PANAS.has(s);
};

const SinglePanaBid = (props) => {
    const { t } = useTranslation();
    return (
        <EasyModeBid
            {...props}
            label={t('gameBid.enterPana')}
            maxLength={3}
            validateInput={validateSinglePana}
            specialModeType="singlePana"
            validSinglePanas={Array.from(VALID_SINGLE_PANAS)}
            showBidsList
            openReviewOnAdd={false}
            showInlineSubmit
            showModeTabs
        />
    );
};

export default SinglePanaBid;
