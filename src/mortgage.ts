import {
  Field,
  SmartContract,
  state,
  State,
  method,
  isReady,
  DeployArgs,
  Permissions,
  Poseidon,
  CircuitValue,
  arrayProp,
  Mina,
  Party,
  PrivateKey,
  PublicKey
} from 'snarkyjs';

export { deploy, submitCreditProofs, createLocalBlockchain, IncomeHistory };

await isReady;

class IncomeHistory extends CircuitValue {
  @arrayProp(Field, 24) value: Field[];

  constructor(value: number[]) {
    super();
    this.value = value.map((row) => Field(row));
  }

  hash() {
    return Poseidon.hash(this.value.flat());
  }
}

// NOTE: Add events and use them in the test
export class MortgageZkApp extends SmartContract {
  @state(Field) minCreditScore = State<Field>();
  @state(Field) monthlyIncomeReq = State<Field>();

  @method init(minCreditScore: Field, monthlyIncomeReq: Field) {
    this.minCreditScore.set(minCreditScore);
    this.monthlyIncomeReq.set(monthlyIncomeReq);
  }

  @method submitCreditProofs(creditScore: Field, incomeHistory: IncomeHistory) {
    this.submitCreditScore(creditScore);
    this.submitIncomeProof(incomeHistory);
  }

  @method submitCreditScore(creditScore: Field) {
    let minCreditScore = this.minCreditScore.get();
    this.minCreditScore.assertEquals(minCreditScore);
    creditScore.assertGte(minCreditScore);
  }

  @method submitIncomeProof(incomeHistory: IncomeHistory) {
    let monthlyIncomeReq = this.monthlyIncomeReq.get();
    this.monthlyIncomeReq.assertEquals(monthlyIncomeReq);
    for (let i = 0; i < 24; i++) {
      incomeHistory.value[i].assertGte(monthlyIncomeReq);
    }
  }
}

// helpers
function createLocalBlockchain(): PrivateKey {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);

  const account = Local.testAccounts[0].privateKey;
  return account;
}

async function deploy(
  zkAppInstance: MortgageZkApp,
  zkAppPrivateKey: PrivateKey,
  minCreditScore: Field,
  monthlyIncomeReq: Field,
  account: PrivateKey
) {
  let tx = await Mina.transaction(account, () => {
    Party.fundNewAccount(account);

    zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    zkAppInstance.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });

    zkAppInstance.init(minCreditScore, monthlyIncomeReq);
  });
  await tx.send().wait();
}

async function submitCreditProofs(
  creditScore: Field,
  incomeProof: IncomeHistory,
  account: PrivateKey,
  zkAppAddress: PublicKey,
  zkAppPrivateKey: PrivateKey
) {
  let tx = await Mina.transaction(account, () => {
    let zkApp = new MortgageZkApp(zkAppAddress);
    zkApp.submitCreditProofs(creditScore, incomeProof);
    zkApp.sign(zkAppPrivateKey);
  })
  try {
    await tx.send().wait();
    return true;
  } catch (err) {
    return false;
  }
}



