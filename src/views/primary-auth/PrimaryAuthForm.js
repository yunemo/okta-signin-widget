/*!
 * Copyright (c) 2015-2016, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

import { _, Form, loc } from 'okta';
import DeviceFingerprint from 'util/DeviceFingerprint';
import TypingUtil from 'util/TypingUtil';
import Util from 'util/Util';
import TextBox from 'views/shared/TextBox';
export default Form.extend({
  className: 'primary-auth-form',
  noCancelButton: true,
  attributes: { novalidate: 'novalidate' },
  save: function() {
    if (this.settings.get('features.passwordlessAuth')) {
      return loc('oform.next', 'login');
    }
    return loc('primaryauth.submit', 'login');
  },
  saveId: 'okta-signin-submit',
  layout: 'o-form-theme',

  // If socialAuth is configured, the title moves from the form to
  // the top of the container (and is rendered in socialAuth).
  title: function() {
    let formTitle = loc('primaryauth.title', 'login');

    if (this.settings.get('socialAuthPositionTop')) {
      formTitle = '';
    }
    return formTitle;
  },

  initialize: function() {
    const trackTypingPattern = this.settings.get('features.trackTypingPattern');

    this.listenTo(this, 'save', function() {
      if (trackTypingPattern) {
        const typingPattern = TypingUtil.getTypingPattern();

        this.options.appState.set('typingPattern', typingPattern);
      }
      const self = this;
      const creds = {
        username: this.model.get('username'),
      };

      if (!this.settings.get('features.passwordlessAuth')) {
        creds.password = this.model.get('password');
      }
      this.settings
        .processCreds(creds)
        .then(function() {
          if (!self.settings.get('features.deviceFingerprinting')) {
            return;
          }
          self.options.appState.trigger('loading', true);
          self.state.trigger('togglePrimaryAuthButton', true);
          return DeviceFingerprint.generateDeviceFingerprint(self.settings.get('baseUrl'), self.$el)
            .then(function(fingerprint) {
              self.options.appState.set('deviceFingerprint', fingerprint);
            })
            .catch(function() {
              // Keep going even if device fingerprint fails
            })
            .finally(function() {
              self.options.appState.trigger('loading', false);
              self.state.trigger('togglePrimaryAuthButton', false);
            });
        })
        .then(_.bind(this.model.save, this.model));
    });

    this.stateEnableChange();
  },

  stateEnableChange: function() {
    this.listenTo(this.state, 'change:enabled', function(model, enable) {
      if (enable) {
        this.enable();
      } else {
        this.disable();
      }
    });
  },

  inputs: function() {
    const inputs = [];

    inputs.push(this.getUsernameField());
    if (!this.settings.get('features.passwordlessAuth')) {
      inputs.push(this.getPasswordField());
    }
    if (this.settings.get('features.rememberMe')) {
      inputs.push(this.getRemeberMeCheckbox());
    }
    return inputs;
  },

  getUsernameField: function() {
    const userNameFieldObject = {
      className: 'margin-btm-30',
      // label: loc('primaryauth.username.placeholder', 'login'),
      'label-top': true,
      placeholder: loc('primaryauth.username.placeholder', 'login'),
      explain: () => {
        if (!this.isCustomized('primaryauth.username.tooltip')) {
          return false;
        }

        return Util.createInputExplain('primaryauth.username.tooltip', 'primaryauth.username.placeholder', 'login');
      },
      'explain-top': true,
      name: 'username',
      input: TextBox,
      inputId: 'okta-signin-username',
      type: 'text',
      disabled: this.options.appState.get('disableUsername'),
      autoComplete: 'username',
      // TODO: support a11y attrs in Courage - OKTA-279025
      render: function() {
        this.$(`input[name=${this.options.name}]`).prop('required', true);
      },
    };

    return userNameFieldObject;
  },

  getPasswordField: function() {
    const passwordFieldObject = {
      className: 'margin-btm-30',
      // label: loc('primaryauth.password.placeholder', 'login'),
      placeholder: loc('primaryauth.password.placeholder', 'login'),
      'label-top': true,
      explain: () => {
        if (!this.isCustomized('primaryauth.password.tooltip')) {
          return false;
        }

        return Util.createInputExplain('primaryauth.password.tooltip', 'primaryauth.password.placeholder', 'login');
      },
      'explain-top': true,
      name: 'password',
      inputId: 'okta-signin-password',
      validateOnlyIfDirty: true,
      type: 'password',
      autoComplete: 'current-password',
      // TODO: support a11y attrs in Courage - OKTA-279025
      render: function() {
        this.$(`input[name=${this.options.name}]`).prop('required', true);
      },
    };

    if (this.settings.get('features.showPasswordToggleOnSignInPage')) {
      passwordFieldObject.params = {};
      passwordFieldObject.params.showPasswordToggle = true;
    }
    return passwordFieldObject;
  },

  isCustomized: function(property) {
    const language = this.settings.get('language');
    const i18n = this.settings.get('i18n');
    const customizedProperty = i18n && i18n[language] && i18n[language][property];

    return !!customizedProperty;
  },

  getRemeberMeCheckbox: function() {
    return {
      label: false,
      placeholder: loc('remember', 'login'),
      name: 'remember',
      type: 'checkbox',
      'label-top': true,
      className: 'margin-btm-0',
      initialize: function() {
        this.listenTo(this.model, 'change:remember', function(model, val) {
          // OKTA-98946: We normally re-render on changes to model values,
          // but in this case we will manually update the checkbox due to
          // iOS Safari and how it handles autofill - it will autofill the
          // form anytime the dom elements are re-rendered, which prevents
          // the user from editing their username.
          this.$(':checkbox').prop('checked', val).trigger('updateState');
        });
      },
    };
  },

  focus: function() {
    if (!this.model.get('username')) {
      this.getInputs().first().focus();
    } else if (!this.settings.get('features.passwordlessAuth')) {
      this.getInputs().toArray()[1].focus();
    }
    if (this.settings.get('features.trackTypingPattern')) {
      TypingUtil.track('okta-signin-username');
    }
  },
});
