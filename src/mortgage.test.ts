import {
  deploy,
  submitCreditProofs,
  createLocalBlockchain,
  IncomeHistory,
  MortgageZkApp
} from './mortgage';
import {
  isReady,
  shutdown,
  Field,
  PrivateKey,
  PublicKey
} from 'snarkyjs';

describe('mortgageZkApp', () => {
  let account: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppInstance: MortgageZkApp;

  const minCreditScore = Field(620);
  const monthlyIncomeReq = Field(1200);
  const creditScore = Field(700);
  const incomeProof = new IncomeHistory(new Array(24).fill(1300));

  beforeEach(async () => {
    await isReady;
    account = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new MortgageZkApp(zkAppAddress);
    return;
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  it('deploys the `MortgageZkApp` smart contract', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);
    // await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount);
    // const num = zkAppInstance.num.get();
    // expect(num).toEqual(Field.one);
  });

  it('correctly submits the credit proofs to the `MortgageZkApp` smart contract', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);

    let accepted = await submitCreditProofs(
      creditScore,
      incomeProof,
      account,
      zkAppAddress,
      zkAppPrivateKey
    )
    expect(accepted).toBe(true);
  });

  it('fails because the credit score is to low for the `MortgageZkApp` smart contract', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);

    const lowCreditScore = Field(600);
    try {
      await submitCreditProofs(
        lowCreditScore,
        incomeProof,
        account,
        zkAppAddress,
        zkAppPrivateKey
      )
    } catch (e) {

    }
  });

  it('fails because the income is to low for the `MortgageZkApp` smart contract', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);

    let lowIncomeProof = new IncomeHistory(new Array(24).fill(1100));
    try {
      await submitCreditProofs(
        creditScore,
        lowIncomeProof,
        account,
        zkAppAddress,
        zkAppPrivateKey
      );
    } catch (e) {

    }
  });

  it('fails to meet all the requirements for the `MortgageZkApp` smart contract', async () => {
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);

    let lowCreditScore = Field(600);
    let lowIncomeProof = new IncomeHistory(new Array(24).fill(1100));
    try {
      await submitCreditProofs(
        lowCreditScore,
        lowIncomeProof,
        account,
        zkAppAddress,
        zkAppPrivateKey
      );
    } catch (e) {

    }
  });
});
