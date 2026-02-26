import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import EasyModeBid from './EasyModeBid';

const validateJodi = (n) => n && /^[0-9]{2}$/.test(n.toString().trim());

const JodiBid = (props) => {
    const { t } = useTranslation();
    return (
        <EasyModeBid
            {...props}
            label={t('gameBid.enterJodi')}
            maxLength={2}
            validateInput={validateJodi}
            showBidsList
            openReviewOnAdd={false}
            showInlineSubmit
            showModeTabs
            specialModeType="jodi"
        />
    );
};

export default JodiBid;
