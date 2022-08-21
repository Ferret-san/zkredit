/**
 * This file specifies how to run the `MortgageZkApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */
import {
    deploy,
    submitCreditProofs,
    createLocalBlockchain,
    IncomeHistory,
    MortgageZkApp
} from './mortgage.js';
import { Field, PrivateKey, shutdown } from 'snarkyjs';
import * as readline from 'node:readline';
import { stdin, stdout } from 'process';

// setup
const account = createLocalBlockchain();
const minCreditScore = Field(620);
const monthlyIncomeReq = Field(1200);
let creditScore = Field(0);
let incomeProof = new IncomeHistory(new Array(24).fill(1300));
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkAppInstance = new MortgageZkApp(zkAppAddress);

const rl = readline.createInterface({
    input: stdin,
    output: stdout
});

rl.question("Enter your credit score: ", function (creditScoreAnswer: string) {
    rl.question("Enter your avg income for the past 2 years: ", function (incomeAnswer: string) {
        creditScore = Field(creditScoreAnswer);
        incomeProof = new IncomeHistory(new Array(24).fill(incomeAnswer));
        rl.close();
    });
});

rl.on('close', async function () {
    console.log('Deploying Mortgage zkApp...');
    await deploy(zkAppInstance, zkAppPrivateKey, minCreditScore, monthlyIncomeReq, account);

    // submit the actual solution
    console.log('Submitting credit history...');
    let result = true;
    try {
        await submitCreditProofs(creditScore, incomeProof, account, zkAppAddress, zkAppPrivateKey);
    } catch {
        console.log("There was an error submitting your credit history");
        result = false;
    }

    if (result) {
        console.log("Congrats, you have been approved!");
    } else {
        console.log("Sadly, you do not meet the minimum requirements for the mortgage");
    }

    // cleanup
    await shutdown();
});


