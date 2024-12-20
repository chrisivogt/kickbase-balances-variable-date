import { LoginResponse, authService } from "./service/auth.service";
import { leagueService } from "./service/league.service";
import { calculateAccountBalance } from "./calculate-account-balance";

export interface NumberRange {
  min: number;
  max: number;
}

export interface UserBalanceData {
  username: string;
  currentBalance: NumberRange;
  currentBalanceFromJSON: number;
  maxBid: NumberRange;
  teamValue: number;
  erkannteTransfers: number;
}

const MONEY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

async function fetchAndCalculateBalances(
  leagueId: string
): Promise<UserBalanceData[]> {
  if (leagueId === undefined) return [];

  const startDate = localStorage.getItem(`KB_SD_${leagueId}`) ?? prompt(`Start Date: ${leagueId}`) ?? "";
  if (startDate === "") {
    alert("enter start date of league");
    throw new Error("start date missing");
  } else {
    localStorage.setItem(`KB_SD_${leagueId}`, startDate);
  }
  const leaguePlayersResult = await leagueService.getUsers(leagueId);

  return await Promise.all(
    leaguePlayersResult.map((user) => calculateAccountBalance(user, leagueId))
  );
}

function toHTML(data: UserBalanceData[]): string {
  const header = `
    <span>Name</span>
    <span>Kontostand errechnet</span>
    <span>Kontostand laut API</span>
    <span>Teamwert</span>
    <span>Maxbid</span>
    <span>Erkannte Transfers</span>
  `;
  const rows = data.map(
    (e) => `
      <span class="name">${e.username}:</span>
      <span class="balance"> ${MONEY_FORMATTER.format(
        e.currentBalance.min
      )} - ${MONEY_FORMATTER.format(e.currentBalance.max)} </span>
      <span class="balance"> ${MONEY_FORMATTER.format(
        e.currentBalanceFromJSON
      )} </span>
      <span class="teamvalue"> ${MONEY_FORMATTER.format(e.teamValue)} </span>
      <span class="maxbid"> ${MONEY_FORMATTER.format(
        e.maxBid.min
      )} - ${MONEY_FORMATTER.format(e.maxBid.max)} </span>
      <span class="name"> ${e.erkannteTransfers}</span>
    `
  );
  return header + rows.join("");
}

async function login(): Promise<LoginResponse> {
  const username =
    localStorage.getItem("KB_EMAIL") ??
    prompt("Kickbase E-Mail eingeben:") ??
    "";
  const password =
    localStorage.getItem("KB_PASSWORD") ?? prompt("Kickbase Passwort:") ?? "";
  
  const loginResult = await authService.login(username, password);

  if (loginResult === undefined) {
    alert("Login failed");
    throw new Error("Login failed");
  }
  localStorage.setItem("KB_EMAIL", username);
  localStorage.setItem("KB_PASSWORD", password);

  return loginResult;
}

const leagueSelect = document.getElementById(
  "league-select"
) as HTMLSelectElement;

leagueSelect.addEventListener("change", async () => {
  const leagueId = leagueSelect.value;
  document.querySelector(".loading-bar")?.classList.add("loading");
  const data = await fetchAndCalculateBalances(leagueId);
  document.querySelector(".loading-bar")?.classList.remove("loading");
  document.querySelector(".data-container")!.innerHTML = toHTML(data);
});
login().then(async (loginResponse: LoginResponse) => {
  leagueSelect.innerHTML = `
    <option value="">Liga auswählen</option>
    ${loginResponse.leagues
      .map((league) => `<option value="${league.id}">${league.name}</option>`)
      .join("")}
  `;
});
