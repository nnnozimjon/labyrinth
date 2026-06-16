export function createLossOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes loss-card-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(255,60,0,0.4), 0 0 60px rgba(255,60,0,0.15); }
      50%       { box-shadow: 0 0 55px rgba(255,60,0,0.7), 0 0 110px rgba(255,60,0,0.35); }
    }
    @keyframes loss-title-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(255,60,0,0.8); }
      50%       { text-shadow: 0 0 36px rgba(255,60,0,1), 0 0 70px rgba(255,60,0,0.5); }
    }
    #loss-retry-btn:hover { background: #cc2200 !important; transform: scale(1.06); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.78)",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: "1000",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "rgba(22,8,8,0.97)",
    border: "2px solid #ff3c00",
    borderRadius: "20px",
    padding: "52px 72px",
    textAlign: "center",
    animation: "loss-card-glow 2s ease-in-out infinite",
  });

  const title = document.createElement("h1");
  title.textContent = "You kinda lost...";
  Object.assign(title.style, {
    color: "#ff3c00", fontSize: "3rem",
    margin: "0 0 8px", fontFamily: "sans-serif", fontWeight: "bold",
    animation: "loss-title-glow 2s ease-in-out infinite",
  });

  const sub = document.createElement("p");
  sub.textContent = "The ball fell in a hole. Better luck next time!";
  Object.assign(sub.style, {
    color: "rgba(255,60,0,0.65)", fontSize: "1.1rem",
    margin: "0 0 34px", fontFamily: "sans-serif",
  });

  const btn = document.createElement("button");
  btn.id = "loss-retry-btn";
  btn.textContent = "Try Again";
  Object.assign(btn.style, {
    background: "#ff3c00", color: "#160808",
    border: "none", borderRadius: "10px",
    padding: "16px 44px", fontSize: "1.2rem", fontWeight: "bold",
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "background 0.18s, transform 0.18s",
    display: "block", margin: "0 auto",
  });

  card.append(title, sub, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => { overlay.style.display = "flex"; },
    hide: () => { overlay.style.display = "none"; },
    onRetry: (cb: () => void) => { btn.addEventListener("click", cb); },
  };
}

export function createWinOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes win-card-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(0,255,68,0.4), 0 0 60px rgba(0,255,68,0.15); }
      50%       { box-shadow: 0 0 55px rgba(0,255,68,0.7), 0 0 110px rgba(0,255,68,0.35); }
    }
    @keyframes win-title-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(0,255,68,0.8); }
      50%       { text-shadow: 0 0 36px rgba(0,255,68,1), 0 0 70px rgba(0,255,68,0.5); }
    }
    #win-next-btn:hover { background: #00cc33 !important; transform: scale(1.06); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.78)",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: "1000",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "rgba(8,22,12,0.97)",
    border: "2px solid #00ff44",
    borderRadius: "20px",
    padding: "52px 72px",
    textAlign: "center",
    animation: "win-card-glow 2s ease-in-out infinite",
  });

  const title = document.createElement("h1");
  title.textContent = "You Win!";
  Object.assign(title.style, {
    color: "#00ff44", fontSize: "3.6rem",
    margin: "0 0 8px", fontFamily: "sans-serif", fontWeight: "bold",
    animation: "win-title-glow 2s ease-in-out infinite",
  });

  const sub = document.createElement("p");
  sub.textContent = "Level Complete";
  Object.assign(sub.style, {
    color: "rgba(0,255,68,0.65)", fontSize: "1.1rem",
    margin: "0 0 34px", fontFamily: "sans-serif",
  });

  const btn = document.createElement("button");
  btn.id = "win-next-btn";
  btn.textContent = "Next Level";
  Object.assign(btn.style, {
    background: "#00ff44", color: "#061008",
    border: "none", borderRadius: "10px",
    padding: "16px 44px", fontSize: "1.2rem", fontWeight: "bold",
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "background 0.18s, transform 0.18s",
    display: "block", margin: "0 auto",
  });

  card.append(title, sub, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => { overlay.style.display = "flex"; },
    hide: () => { overlay.style.display = "none"; },
    onNextLevel: (cb: () => void) => { btn.addEventListener("click", cb); },
  };
}

export function createGiftOverlay() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes gift-card-glow {
      0%, 100% { box-shadow: 0 0 30px rgba(255,200,0,0.45), 0 0 60px rgba(255,160,0,0.2); }
      50%       { box-shadow: 0 0 55px rgba(255,200,0,0.75), 0 0 110px rgba(255,160,0,0.35); }
    }
    @keyframes gift-title-glow {
      0%, 100% { text-shadow: 0 0 18px rgba(255,200,0,0.8); }
      50%       { text-shadow: 0 0 36px rgba(255,200,0,1), 0 0 70px rgba(255,160,0,0.5); }
    }
    #gift-ok-btn:hover { background: #e6a800 !important; transform: scale(1.06); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.78)",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: "1000",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: "rgba(28,20,6,0.97)",
    border: "2px solid #ffc800",
    borderRadius: "20px",
    padding: "52px 72px",
    textAlign: "center",
    animation: "gift-card-glow 2s ease-in-out infinite",
  });

  const title = document.createElement("h1");
  title.textContent = "Take your gift!";
  Object.assign(title.style, {
    color: "#ffc800", fontSize: "3.2rem",
    margin: "0 0 8px", fontFamily: "sans-serif", fontWeight: "bold",
    animation: "gift-title-glow 2s ease-in-out infinite",
  });

  const sub = document.createElement("p");
  sub.textContent = "You found the surprise on the board.";
  Object.assign(sub.style, {
    color: "rgba(255,200,0,0.7)", fontSize: "1.1rem",
    margin: "0 0 34px", fontFamily: "sans-serif",
  });

  const btn = document.createElement("button");
  btn.id = "gift-ok-btn";
  btn.textContent = "Okay";
  Object.assign(btn.style, {
    background: "#ffc800", color: "#1c1406",
    border: "none", borderRadius: "10px",
    padding: "16px 44px", fontSize: "1.2rem", fontWeight: "bold",
    cursor: "pointer", fontFamily: "sans-serif",
    transition: "background 0.18s, transform 0.18s",
    display: "block", margin: "0 auto",
  });

  card.append(title, sub, btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  return {
    show: () => { overlay.style.display = "flex"; },
    hide: () => { overlay.style.display = "none"; },
    onOkay: (cb: () => void) => { btn.addEventListener("click", cb); },
  };
}
