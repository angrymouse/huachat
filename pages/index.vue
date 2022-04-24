<template>
	<div
		class="
			w-full
			h-full
			flex
			justify-center
			bg-stone-800
			text-white
			items-center
		"
	>
		<div
			class="
				h-[42rem]
				max-h-[80%]
				flex flex-col
				justify-start
				items-start
				rounded-md
				max-w-lg
				w-[28rem]
				border-2 border-double border-gray-900
				bg-gray-800
			"
		>
			<div
				class="card-header w-full text-center bg-slate-900 py-2 rounded-t-md"
			>
				CHIHUAHUA.CHAT
			</div>
			<div
				class="w-full h-full flex items-center justify-center"
				v-if="messages == null"
			>
				<p class="text-xl font-mono font-semibold inline">
					Wait, chat is loading
				</p>
			</div>
			<div
				v-else
				class="card-body h-full w-full flex p-1 flex-col overflow-y-scroll"
				ref="messagesdiv"
			>
				<div
					v-for="message in messages"
					:key="message.hash"
					class="p-2 rounded-sm m-1 bg-gray-900"
				>
					<div class="inline-flex font-thin text-cyan-900">
						{{ message.from.nickname }}:
					</div>
					{{ message.msg }}
				</div>
			</div>
			<div
				class="
					card-footer
					w-full
					bg-gray-700
					min-h-10
					rounded-b-md
					flex flex-row
					p-2
					items-center
					justify-center
				"
			>
				<button
					v-if="keystationAccount == null"
					class="p-1 rounded-md bg-purple-500 px-2"
					@click="login"
				>
					Connect Keystation to start chatting!
				</button>
				<template v-else>
					<input
						v-model="currentMsg"
						placeholder="Woof woof here!"
						class="outline-0 bg-slate-500 p-2 w-full rounded"
					/>
					<button class="m-1 p-2 rounded bg-amber-600" @click="sendMsg">
						WOOF!
					</button>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from "vue";
import { StargateClient, accountFromAny } from "@cosmjs/stargate";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import {
	Tendermint34Client,
	pubkeyToAddress,
	rawSecp256k1PubkeyToRawAddress,
} from "@cosmjs/tendermint-rpc";
import Keystation from "@cosmostation/keystation-es6";
let channel = "chihuahua1a3uq57j3gnwk4xmqhy2j5zhzasfm4k73pe9r3h";
let currentMsg = ref("");
let keystation = new Keystation();
keystation.client = "https://keystation.cosmostation.io";
keystation.lcd = "https://api.chihuahua.wtf";
keystation.path = "44/118/0/0/0";
let keystationAccount = ref(null);
let messages = ref(null);
let prefix = "chihuahua";

window.addEventListener(
	"message",
	function (e) {
		console.log(e.origin);
		if (
			e.origin != keystation.client ||
			!e.data ||
			!e.data.account ||
			!e.data.address
		)
			return;
		console.log(e.data);
		// e.data.account : User's keychain account. Remember this account!
		keystationAccount.value = e.data;
	},
	false
);
function login() {
	let popup = keystation.openWindow("signin", prefix);
}

const rpcEndpoint = "https://rpc.chihuahua.wtf";

Tendermint34Client.connect(rpcEndpoint).then(async (tmClient) => {
	window.tmClient = tmClient;
	const client = new StargateClient(tmClient, {
		accountParser: accountFromAny,
	});
	async function fetchMessages() {
		let txEs = await client.searchTx(
			{ sentFromOrTo: channel },
			{ minHeight: 1800000 }
		);
		messages.value = txEs
			.map((txE) => decodeTxRaw(txE.tx))
			.filter(
				(tx) =>
					tx.body.memo &&
					tx.body.memo.startsWith("HUAMSG:") &&
					tx.body.memo.split(":").length == 3 &&
					tx.body.memo.split(":")[1].length > 0
			)
			.map((tx, txi) => {
				// console.log(tx);
				// console.log(rawSecp256k1PubkeyToRawAddress(tx.signatures[0]));
				return {
					msg: tx.body.memo.split(":")[1],
					from: { nickname: tx.body.memo.split(":")[2] },
					hash: txEs[txi].hash,
				};
			});
		$refs.messagesdiv.scrollTop = $refs.messagesdiv.scrollHeight;
	}
	fetchMessages();

	setInterval(fetchMessages, 10000);
});
async function sendMsg() {
	let msg = currentMsg.value;
	currentMsg.value = "";
	if (msg.length < 1) {
		return;
	}
	messages.value.push({
		msg: msg,
		from: { nickname: keystationAccount.value.account },
		hash: "",
	});
	let accInfo = await (
		await fetch(
			`${keystation.lcd}/auth/accounts/${keystationAccount.value.address}`
		)
	).json();
	console.log(accInfo);
	let txJson = {
		account_number: accInfo.result.value.account_number,
		chain_id: "chihuahua-1",
		fee: { amount: [{ amount: "35000", denom: "uhuahua" }], gas: "200000" },
		memo: "HUAMSG:" + msg + ":" + keystationAccount.value.account,
		msgs: [
			{
				type: "cosmos-sdk/MsgSend",
				value: {
					amount: [{ amount: "1000", denom: "uhuahua" }],
					from_address: keystationAccount.value.address,
					to_address: channel,
				},
			},
		],
		sequence: accInfo.result.value.sequence,
	};

	var txJsonStr = JSON.stringify(txJson);
	var popup = keystation.openWindow(
		"transaction",
		txJsonStr,
		keystationAccount.value.account
	);
}
</script>