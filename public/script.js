document.addEventListener('DOMContentLoaded', () => {
    const contactList = document.getElementById('contactList');
    const eventList = document.getElementById('eventList');
    const unreadCountElement = document.getElementById('unreadCount');
    const unreadEmailList = document.getElementById('unreadedEmailList');
    const textGeneratingContent = document.getElementById('textGeneratingContent');
    const emailsPerDayList = document.getElementById('emailsPerDayList');

    const fetchContacts = async () => {
        try {
            const response = await fetch('/nylas/list-contacts');
            const contacts = await response.json();

            contactList.innerHTML = '';

            contacts.data.forEach(contact => {
                const li = document.createElement('li');
                const birthdayToSend = contact.birthdayToSend;

                li.innerHTML = `
                    <span><strong>${contact.givenName}</strong> - Birthday: ${new Date(contact.birthday).toLocaleDateString()}</span>
                    ${birthdayToSend ? '<button class="congratulate-btn">Send Congratulations</button>' : ''}
                `;

                if (birthdayToSend) {
                    const button = li.querySelector('.congratulate-btn');
                    button.addEventListener('click', () => sendCongratulations(contact));
                }

                contactList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const sendCongratulations = async (ob) => {
        const today = new Date();
        const dateToCompare = new Date(ob.birthday);
        if (
            today.getDate() === dateToCompare.getDate() &&
            today.getMonth() === dateToCompare.getMonth()
        ) {
            if (ob.emails.length !== 0) {
                try {
                    const personInfo = {
                        name: ob.givenName,
                        birthday: ob.birthday,
                        email: ob.emails[0].email,
                    };
                    const response = await fetch('/nylas/send-congratulation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(personInfo),
                    });
                    const result = await response.json();
                    console.log(result.message);
                } catch (error) {
                    console.error('Error sending congratulations:', error);
                }
            }
        }
    };

    const eventContacts = async () => {
        try {
            const response = await fetch('/nylas/list-events');
            const events = await response.json();

            eventList.innerHTML = '';

            events.data.forEach(event => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>
                        <strong>${event.title}</strong> 
                        <p>At ${new Date(event.when.startTime * 1000).toLocaleString()}</p>
                    </span>
                `;
                eventList.appendChild(li);
            });

        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const fetchUnreadEmailsCount = async () => {
        try {
            const response = await fetch('/nylas/unreaded-emails');
            const data = await response.json();

            const unreadCount = data.data.length || 0;
            unreadCountElement.textContent = unreadCount;
        } catch (error) {
            console.error('Error fetching unread emails count:', error);
            unreadCountElement.textContent = '0';
        }
    };

    const fetchUnreadEmails = async () => {
        try {
            const response = await fetch('/nylas/unreaded-emails');
            const emails = await response.json();

            unreadEmailList.innerHTML = ''; // Clear any existing emails

            emails.data.forEach(email => {
                const li = document.createElement('li');
                const fromDetails = email.from.map(sender => `${sender.name} - ${sender.email}`).join(', ');
                li.innerHTML = `
                    <span class="email-subject">${email.subject}</span><br>
                    <span class="email-time">${new Date(email.date * 1000).toLocaleString()}</span><br>
                    <span class="email-time">From: ${fromDetails}</span><br>
                    <button class="summary-btn" data-id="${email.id}">Summarize Email</button>
                `;

                const summaryBtn = li.querySelector('.summary-btn');
                summaryBtn.addEventListener('click', () => summarizeEmail(email.snippet, email));

                unreadEmailList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching unread emails:', error);
        }
    };

    const summarizeEmail = async (textToSummarize, email) => {
        try {
            const response = await fetch(`/cloud/summarize?text=${encodeURIComponent(textToSummarize)}`);
            const data = await response.json();
            const li = document.createElement('li');

            li.innerHTML = `
                <p>${data}</p>
                <button class="text-generation">Generate Answer?</button>
            `;
            const generatingBtn = li.querySelector('.text-generation');
            generatingBtn.addEventListener('click', () => textGenerating(textToSummarize, email));
            unreadEmailList.appendChild(li);
        } catch (error) {
            console.error('Error summarizing email:', error);
        }
    };

    const textGenerating = async (textToSummarize, email) => {
        try {
            const response = await fetch(`/cloud/text-generating?text=${encodeURIComponent(textToSummarize)}`);
            const text = await response.json();
            const li = document.createElement('li');

            li.innerHTML = `
            <p>${text.result.response}</p>
            <button class="send-email">Send email?</button>
            `;
            const sendEmailBtn = li.querySelector('.send-email');
            sendEmailBtn.addEventListener('click', () => sendEmail(text.result.response, email));
            textGeneratingContent.appendChild(li);
        } catch (error) {
            console.error('Error generating text:', error);
        }
    };

    const sendEmail = async (textToSend, email) => {
        console.log(email);
        try {
            const response = await fetch('/nylas/send-generated-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textToSend,
                    name: email.from[0].name,
                    email: email.from[0].email,
                }),
            });
            const result = await response.json();
            console.log(result.message);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    };

    const fetchEmailsPerDay = async () => {
        try {
            const response = await fetch('/nylas/emails-current-week');
            const emailsPerDay = await response.json();

            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            emailsPerDayList.innerHTML = '';

            emailsPerDay.forEach((count, index) => {
                const li = document.createElement('li');
                li.textContent = `${daysOfWeek[index]}: ${count} emails`;
                emailsPerDayList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching emails per day:', error);
        }
    };
    
    fetchUnreadEmailsCount();
    fetchContacts();
    eventContacts();
    fetchUnreadEmails();
    fetchEmailsPerDay();
});
