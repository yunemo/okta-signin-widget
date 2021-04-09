/* eslint no-console: 0 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const signinWidgetOptions = require('../.widgetrc.js'); // commonJS module

import OktaSignIn from '../types';

declare global {
  interface Window {
    // added by widget CDN bundle
    OktaSignIn: typeof OktaSignIn;

    // added in this file
    getWidgetInstance: () => OktaSignIn;
    renderPlaygroundWidget: (options: OktaSignIn.WidgetConfig) => void;
  }
}

if (typeof window.OktaSignIn === 'undefined') {
  // Make sure OktaSignIn is available
  setTimeout(() => window.location.reload(), 2 * 1000);
}

function isSuccessNonOIDC(res: OktaSignIn.RenderResult): res is OktaSignIn.RenderResultSuccessNonOIDCSession {
  return (res as OktaSignIn.RenderResultSuccessNonOIDCSession).session !== undefined;
}

let signIn: OktaSignIn;
const renderPlaygroundWidget = (options = {}) => {
  if (signIn) {
    signIn.remove();
  }

  signIn = new window.OktaSignIn(Object.assign({}, signinWidgetOptions, options));

  signIn.renderEl(
    { el: '#okta-login-container' },

    function success(res) {
      // Password recovery flow
      if (res.status === 'FORGOT_PASSWORD_EMAIL_SENT') {
        alert('SUCCESS: Forgot password email sent');
        return;
      }

      // Unlock account flow
      if (res.status === 'UNLOCK_ACCOUNT_EMAIL_SENT') {
        alert('SUCCESS: Unlock account email sent');
        return;
      }

      // User has completed authentication (res.status === 'SUCCESS')

      // 1. Widget is not configured for OIDC, and returns a sessionToken
      //    that needs to be exchanged for an okta session
      if (isSuccessNonOIDC(res)) {
        console.log(res.user);
        res.session.setCookieAndRedirect(signinWidgetOptions.baseUrl + '/app/UserHome');
        return;
      }

      // 2. Widget is configured for OIDC, and returns tokens. This can be
      //    an array of tokens or a single token, depending on the
      //    initial configuration.
      else if (Array.isArray(res)) {
        console.log(res);
        alert('SUCCESS: OIDC with multiple responseTypes. Check console.');
      }
      else {
        console.log(res);
        alert('SUCCESS: OIDC with single responseType. Check Console');
      }
    },

    function error(err) {
      console.error('global error handler: ', err);
    }
  );

  signIn.on('ready', () => {
    // handle `ready` event.
    // use `console.log` in particular so that those logs can be retrived
    // in testcafe for assertion
    console.log('===== playground widget ready event received =====');
  });

  signIn.on('afterRender', (context) => {
    // handle `afterRender` event.
    // use `console.log` in particular so that those logs can be retrived
    // in testcafe for assertion
    console.log('===== playground widget afterRender event received =====');
    console.log(JSON.stringify(context));
  });

  signIn.on('afterError', (context, error) => {
    // handle `afterError` event.
    // use `console.log` in particular so that those logs can be retrived
    // in testcafe for assertion
    console.log('===== playground widget afterError event received =====');
    console.log(JSON.stringify(context));
    console.log(JSON.stringify(error));
  });


};

window.getWidgetInstance = function() {
  return signIn;
};

window.renderPlaygroundWidget = renderPlaygroundWidget;
renderPlaygroundWidget();
