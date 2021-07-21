import { Observable, of } from 'rxjs';
import { AnswerPost } from 'app/entities/metis/answer-post.model';
import { HttpResponse } from '@angular/common/http';

export class MockAnswerPostService {
    create = (courseId: number, answerPost: AnswerPost): Observable<AnswerPost> => of(answerPost);
    update = (courseId: number, answerPost: AnswerPost): Observable<AnswerPost> => of(answerPost);

    delete(answerPost: AnswerPost): Observable<HttpResponse<any>> {
        return of();
    }
}
