import { RequestMock, RequestLogger } from 'testcafe';
import IdentityPageObject from '../framework/page-objects/IdentityPageObject';
import EnrollProfileUpdateViewPageObject from '../framework/page-objects/EnrollProfileUpdateViewPageObject';
import xhrIdentify from '../../../playground/mocks/data/idp/idx/identify-with-password';
import xhrEnrollProfileUpdate from '../../../playground/mocks/data/idp/idx/enroll-profile-update-params';
import xhrEnrollProfileUpdateAllOptional from '../../../playground/mocks/data/idp/idx/enroll-profile-update-all-optional-params';

const xhrEnrollProfileUpdateMock = RequestMock()
  .onRequestTo('http://localhost:3000/idp/idx/introspect')
  .respond(xhrIdentify)
  .onRequestTo('http://localhost:3000/idp/idx/identify')
  .respond(xhrEnrollProfileUpdate);

const xhrEnrollProfileUpdateAllOptionalMock = RequestMock()
  .onRequestTo('http://localhost:3000/idp/idx/introspect')
  .respond(xhrIdentify)
  .onRequestTo('http://localhost:3000/idp/idx/identify')
  .respond(xhrEnrollProfileUpdateAllOptional);

const requestLogger = RequestLogger(
  /idx\/skip/,
  {
    logRequestBody: true,
    stringifyRequestBody: true,
  }
);

fixture('Enroll Profile update additional information');

async function setup(t) {
  const identityPage = new IdentityPageObject(t);
  await identityPage.navigateToPage();
  return identityPage;
}

test.requestHooks(xhrEnrollProfileUpdateMock)('should have correct form title, field and error', async t => {
  const enrollProfileUpdatePage = new EnrollProfileUpdateViewPageObject(t);
  const identityPage = await setup(t);
  await identityPage.fillIdentifierField('test');
  await identityPage.fillPasswordField('test 123');
  await identityPage.clickNextButton();

  await t.expect(enrollProfileUpdatePage.getFormTitle()).eql('Additional Profile information');
  await t.expect(await enrollProfileUpdatePage.skipSetUpLinkExists()).notOk();
  await t.expect(await enrollProfileUpdatePage.getFormFieldLabel('userProfile.secondEmail')).eql('Secondary email');
  await t.expect(enrollProfileUpdatePage.getFormFieldSubLabel('userProfile.secondEmail')).eql('Optional');

  // show error when field is required
  await enrollProfileUpdatePage.clickFinishButton();
  await t.expect(enrollProfileUpdatePage.getTextBoxErrorMessage('userProfile.newAttribute2')).eql('This field cannot be left blank');
});

test.requestHooks(requestLogger, xhrEnrollProfileUpdateAllOptionalMock)('should have skip link when all fields are optional', async t => {
  const enrollProfileUpdatePage = new EnrollProfileUpdateViewPageObject(t);
  const identityPage = await setup(t);
  await identityPage.fillIdentifierField('test');
  await identityPage.fillPasswordField('test 123');
  await identityPage.clickNextButton();

  await t.expect(await enrollProfileUpdatePage.skipSetUpLinkExists()).ok();
  await t.expect(enrollProfileUpdatePage.getSetUpSkipLinkText()).eql('Skip Profile');
  await t.expect(enrollProfileUpdatePage.getSaveButtonLabel()).eql('Finish');

  requestLogger.clear();
  await enrollProfileUpdatePage.clickSetUpSkipLink();
  const req = requestLogger.requests[0].request;
  await t.expect(req.url).eql('http://localhost:3000/idp/idx/skip');
});