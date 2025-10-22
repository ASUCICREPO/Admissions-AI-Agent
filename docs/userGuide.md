# User Guide

For a full walkthrough video, please refer to the [Demo Video](https://www.youtube.com/watch?v=HIg1x8q3VXY) link.

---

## Essentials

- Solution must be deployed (`docs/deploymentGuide.md`).
- Salesforce, Twilio, and AWS credentials should already be in place.

---

## Student Flow 

1. **Explore the site** – Students land on the admissions page, see program highlights, and can open the Nemo chat at any time.

![Inquiry Form](./media/uf-1.png)

2. **Submit the inquiry form** – API Gateway + Lambda push the details into Salesforce and send a confirmation.

![Submission Confirmation](./media/uf-2.png)


3. **Chat with Nemo** – The Bedrock-backed agent builds rapport, answers questions from the knowledge base, and tracks context during the session.

![Chat with Nemo](./media/uf-3.png)

![Chat with Nemo with search in knowledge base](./media/uf-4.png)

4. **Accept an advisor handoff** – Nemo collects contact info, updates the Salesforce lead to “Working - Connected,” logs a Task with the chat summary, and queues a WhatsApp message.

![Advisor Handoff](./media/uf-5.png)

![WhatsApp Follow-up](./media/uf-6.png)

5. **Receive WhatsApp follow-up** – Students get a personalized confirmation that mirrors their chosen timing window (within two hours or next business day).

6. **Salesforce lead list** – New and handed-off leads appear and current status.
![Salesforce lead list](./media/uf-7.png)

---

## Admissions Flow 

1. **Salesforce lead list** – New and handed-off leads appear with current status.
2. **AI chat summary Task** – Each handoff adds a Task titled “AI Chat Summary - Advisor Handoff” with the chat history and recommended next steps.


